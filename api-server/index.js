const express = require("express")
const { generateSlug } = require("random-word-slugs")
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs")
const { Server } = require("socket.io")
const { createClient } = require("@clickhouse/client")
const { Kafka } = require("kafkajs")
const { v4: uuidv4 } = require('uuid');
const fs = require("fs")
const path = require("path")

const PROJECT_ID = process.env.PROJECT_ID

const kafka = new Kafka({
    clientId: `docker-api-server-${PROJECT_ID}`,
    brokers: ["kafka-211faedb-aniketkurkute1827-77db.i.aivencloud.com:22834"],
    sasl: {
        username: "avnadmin",
        password: "",
        mechanism: "plain"
    },
    ssl: {
        ca: [fs.readFileSync(path.join(__dirname, "kafka.pem"), "utf-8")],
    }
})

const consumer = kafka.consumer({ groupId: "api-server-logs-consumer"})


const app = express()

const io = new Server({ cors: '*'})

const client = createClient({
    host: "https://clickhouse-3625e41a-aniketkurkute1827-77db.i.aivencloud.com:22822",
    port: 22822,
    username: "avnadmin",
    password: "",
    database: "default"
})

io.listen(10001, () => {
    console.log("Socket.io Server is running on port 10001")
})

io.on("connection", (socket) => {
    socket.on("subscribe", (channel) => {
        socket.join(channel);
        socket.emit("message", `Subscribed to channel: ${channel}`);
    });
})

const ecsClient = new ECSClient({
    region: "eu-north-1",
    credentials: {
        accessKeyId: "",
        secretAccessKey: ""
    }
})

app.use(express.json())

app.post("/project", async (req, res) => {
    try {
        const { gitUrl } = req.body;
        const projectSlug = generateSlug();

        const command = new RunTaskCommand({
            cluster: "arn:aws:ecs:eu-north-1:851429953726:cluster/build-cluster",
            taskDefinition: "arn:aws:ecs:eu-north-1:851429953726:task-definition/build-task",
            launchType: "FARGATE",
            count: 1,
            networkConfiguration: {
                awsvpcConfiguration: {
                    subnets: ["subnet-0097b0d035941be03", "subnet-0463935c472eafa55", "subnet-09f1b9d9b2fc6d7f9"],
                    securityGroups: ["sg-019efdccc027a85ab"],
                    assignPublicIp: "ENABLED" // may be needed depending on setup
                }
            },
            overrides: {
                containerOverrides: [
                    {
                        name: "build-image",
                        environment: [
                            { name: "GIT_REPOSITORY_URL", value: gitUrl },
                            { name: "PROJECT_ID", value: projectSlug }
                        ]
                    }
                ]
            }
        });

        await ecsClient.send(command);

        return res.json({
            status: "queued",
            data: {
                projectSlug,
                url: `https://${projectSlug}.localhost:8000`
            }
        });

    } catch (error) {
        console.error("Error in /project route:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

async function initiKafkaConsumer() {
    await consumer.connect().then(() => {
        console.log("API Server connected to Kafka consumer");
    }).catch(err => {
        console.error("API Server failed to connect to Kafka consumer:", err);
    });

    await consumer.subscribe({topics: ["container-logs"], fromBeginning: true}).then(() => {
        console.log("API Server subscribed to container-logs topic");
    }).catch(err => {
        console.error("API Server failed to subscribe to container-logs topic:", err);
    });

    await consumer.run({
        autoCommit: false,
        eachBatch: async( { batch, commitOffsetsIfNecessary, heartbeat, resolveOffset }) => {
            const messages = batch.messages;
            console.log("Received messages from Kafka:", messages.length);
            for(const message of messages) {
                const stringMessage = message.value.toString();
                const logData = JSON.parse(stringMessage);

                const { quiery_id } = await client.insert({
                    table: "log_events",
                    values: [
                        {
                            event_id: uuidv4(),
                            project_id: logData.PROJECT_ID,
                            log: logData.log,
                            timestamp: new Date().toISOString()
                        }
                    ],
                    format: "JSONEachRow"
                })
                resolveOffset(message.offset);
                await commitOffsetsIfNecessary(message.offset)
                await heartbeat();
                console.log("Query ID:", quiery_id);
                console.log("Inserted log into ClickHouse:", logData);
            }
        }   
    })
}

initiKafkaConsumer()

app.listen(10000, () => {
    console.log("API Server is running on port 10000");
});
