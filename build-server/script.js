const fs = require("fs")
const path = require("path")
const { exec } = require("child_process")
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3")
const mime = require("mime-types")
const { Kafka } = require("kafkajs")

const PROJECT_ID = process.env.PROJECT_ID

const kafka = new Kafka({
    clientId: `docker-build-server-${PROJECT_ID}`,
    brokers: ["kafka-211faedb-aniketkurkute1827-77db.i.aivencloud.com:22834"],
    sasl: {
        username: "avnadmin",
        password: "AVNS_FRU0eRu7FsSJab3ltbP",
        mechanism: "plain"
    },
    ssl: {
        ca: [fs.readFileSync(path.join(__dirname, "kafka.pem"), "utf-8")],
    }
})

const producer = kafka.producer()

const s3Client = new S3Client({
    region: "eu-north-1",
    credentials: {
        accessKeyId: "AKIA4MPJOCC7IRQVF4VY",
        secretAccessKey: "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"
    }
})

async function init() {
    console.log("Connecting to Kafka...")
    await producer.connect().then(() => {
        console.log("Connected to Kafka")
    }).catch(err => {
        console.error("Failed to connect to Kafka:", err)
    })
    console.log("Execution script.js.....")
    publishLog("Build started for project: " + PROJECT_ID)
    const outDirPath = path.join(__dirname, "output")
    const child = exec(`cd ${outDirPath} && /home/app/install.sh`, (error, stdout, stderr) => {
        if (error) {
            console.error("Build failed with error:", error.message)
            return
        }

        if (stderr) {
            console.error("stderr:", stderr)
        }

        console.log("stdout:", stdout)
    })

    
    child.on("close", async () => {
        console.log("initiation done...")
        publishLog("Build completed for project: " + PROJECT_ID)
        console.log("Uploading files to S3...")
        publishLog("Uploading files to S3 for project: " + PROJECT_ID)
    
        const distFolderPath = path.join(__dirname, "output", "dist")
        const distFolderContent = fs.readdirSync(distFolderPath, { recursive: true })
        console.log("Dist folder content: ", distFolderContent)

        publishLog("Starting to upload")
        for (const file of distFolderContent) {
            const filePath = path.join(distFolderPath, file)
            if (fs.lstatSync(filePath).isDirectory()) continue;

            const command = new PutObjectCommand({
                Bucket: "anikets-vercel-clone",
                Key: `__outputs/${PROJECT_ID}/${file}`,
                Body: fs.createReadStream(filePath),
                ContentType: mime.lookup(filePath)
            })

            await s3Client.send(command)
            console.log(`Uploaded ${filePath} to S3`)
            publishLog(`Uploaded ${file} to S3 for project: ${PROJECT_ID}`)
        }
        publishLog("All files uploaded to S3 for project: " + PROJECT_ID)
    })   
}

async function publishLog(log) {
    await producer.send({
        topic: "container-logs",
        messages: [
            {
                key: 'log',
                value: JSON.stringify({ PROJECT_ID, log})
            }
        ]
    }).then(() => {
        console.log("Log published to Kafka:", log)
    }).catch(err => {
        console.error("Failed to publish log to Kafka: ", err)
    })
}

init()
