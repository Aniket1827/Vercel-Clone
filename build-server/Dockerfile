FROM node:22

# Install git
RUN apt-get update && apt-get install -y git

WORKDIR /home/app

COPY main.sh main.sh
COPY script.js script.js
COPY package*.json ./
COPY install.sh install.sh
COPY kafka.pem kafka.pem

RUN npm install 
RUN chmod +x main.sh 
RUN chmod +x script.js
RUN chmod +x install.sh

CMD [ "/home/app/main.sh" ]
