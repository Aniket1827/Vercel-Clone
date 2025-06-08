const express = require('express');
const httpProxy = require('http-proxy');

const app = express()
const basePath = "https://anikets-vercel-clone.s3.eu-north-1.amazonaws.com/__outputs/"

const proxy = httpProxy.createProxy();

app.use((req, res) => {
    const hostname = req.hostname
    const subdomain = hostname.split(".")[0]
    const resolvesTo = basePath + "/" + subdomain 

    proxy.web(req, res, { target: resolvesTo, changeOrigin: true})
})

proxy.on('proxyReq', (proxyReq, req, res) => {
    const url = req.url;
    if (url === '/')
        proxyReq.path += 'index.html'

})

app.listen(8000, () => {
    console.log('S3 Reverse Proxy is running on port 8000');
})