const http = require('http');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

const logEvents = require('./logEvents');
const EventEmitter = require('events');
class Emitter extends EventEmitter {};
// Initialize object
const myEmitter = new Emitter();


myEmitter.on('log', (msg, fileName) => {
    logEvents(msg, fileName);
});

const PORT = process.env.PORT || 3500;

const serveFile = async (filePath, contentType, response) => {
    try{
        // read file and determine encoded format
        const rawData = await fsPromises.readFile(
            filePath, 
            !contentType.includes('image') ? 'utf8' : '' //    read data has type of string as utf8 format but if contentType includes image do not use utf8 format
        );  
        
        // check if contentType is JSON then parse the data to JSON
        const data = contentType === 'application/json'
            ? JSON.parse(rawData) : rawData;                           // parse to json if contentype is json
       
            response.writeHead(                                         // Set response status code 
            filePath.includes('404.html') ? 404 : 200,  
            {'ContentType' : contentType}
        );
        response.end(
            contentType === 'application/json' ? JSON.stringify(data) : data
        );
    }catch (err){
        console.log(err);
        myEmitter.emit('log', `${err.name}\:${err.message}`, 'errLog.txt');
        response.statusCode = 500;
    response.end();        
    }
};

const server = http.createServer( (req, res) => {
    console.log(req.url, req.method);
    myEmitter.emit('log', `${req.url}\t${req.method}`, 'reqLog.txt');
    const extension = path.extname(req.url);                    // Get the file extension in request url

    let contentType;

    switch (extension) {
        case '.css':
            contentType = 'text/css';
            break;
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.jpg':
            contentType = 'image/jpeg';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.txt':
            contentType = 'text/plain';
            break;
        default:
            contentType = 'text/html';
    }


        // Set file path base on content type
    let filePath = 
        contentType === 'text/html' && req.url === '/'                  // Is url = '/' then it is root path
        ? path.join(__dirname, 'views', 'index.html')                   // Go to to index.html
        : contentType === 'text/html' && req.url.slice(-1) === '/'      // Is url end with '/' then it is sub_dir
        ? path.join(__dirname, 'views', req.url, 'index.html')          // Go to sub_dir's index.html
        : contentType === 'text/html'                                   // If content type is 'text/html' but url doesn't match any case above then it is a file name
        ? path.join(__dirname, 'views', req.url)                        // Go to views and find the requested file
        : path.join(__dirname, req.url);                                // If content type is not 'text/html' then set url as a path

    if (!extension && req.url.slice(-1) !== '/') filePath += '.html';   // If there is not file extension in url and url is not end with '/' then
                                                                        // append .html to the url
    const fileExists = fs.existsSync(filePath);                         // Is there any file match with the file path we have

    if (fileExists){                                                    // If the file exist then
                                                                        // serve the file
        serveFile(filePath, contentType, res);                          
    }else{
        switch (path.parse(filePath).base) {                            
            case 'old-page.html':                                       // If it request 'old-page.html' then
                res.writeHead(301, { 'Location' : '/new-page.html'});   // Redirect to 'new-page.html'
                res.end();
                break;
            case 'www-page.html':
                res.writeHead(301, { 'Location' : '/'});
                res.end();
                break;
            default:
                //  serve a 404 response
                serveFile(path.join(__dirname, 'views', '404.html'), 'text/html', res);

        }
    }
});


server.listen(PORT, () => console.log(`Server running on port ${PORT}`));