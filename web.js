var sys = require("sys")
  , fs = require('fs')
  , express = require('express')
  , io = require('socket.io')
  , Canvas = require('canvas')
  , Image = Canvas.Image
  , exec = require("child_process").exec
  , form = require('connect-form')
  , Error = require('./error');

var error = new Error();
var app = express.createServer(form({ keepExtensions: true, uploadDir: __dirname + '/images' }));
var server = io.listen(app);

require('nko')('o5nIpNA2L1YuKWrV');

// Serve static files
app.use("/css", express.static(__dirname + '/public/css'));
app.use("/js", express.static(__dirname + '/public/js'));

app.get('/', function(request, response) {
    response.sendfile(__dirname + '/public/index.html');
});

app.post('/upload', function(request, response, next) {
    request.form.complete(function(err, fields, files) {
        if (err) {
            next(err);
        } else {
            console.log('\nuploaded %s to %s', files.image.filename, files.image.path);
            error.send('Ohw god! The server is unable to save your image, try again!');
            response.redirect('back');
        }
    });
});

/*
 * Reponse with error for client Ajax Requests
 */
var errorResponse = function(response, message) {
    response.writeHead(200, {"Content-Type": "text/html"});
    response.write(JSON.stringify({'error':message}));
    response.end();
};

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});

server.sockets.on('connection', function (socket) {

  // Send image list to client
  socket.on('client-connect', function (data) {
    console.log('Sending image list to client');

    fs.readdir(__dirname + '/images', function(err, files) {
      if (err) throw err;

      console.log(sys.inspect(files));
      socket.emit('image-list', JSON.stringify(files));
    });
  });

  // Listen for sourcecode events from client
  socket.on('sourcecode', function(data) {
    console.log('Receiving sourcecode: \n' + data);

    var json_message = JSON.parse(data).sourcecode;
    var imageName = json_message.split(' ')[0]
    var json_message = "images/" + json_message
    var imageOutput = "images_output/" + new Date().getTime() + imageName
    var convert_params = json_message + " " + imageOutput

    child = exec("convert " + convert_params, function (error, stdout, stderr) {
      console.log("stdout: " + stdout);
      console.log("stderr: " + stderr);
      console.log("error: " + error)

      var marvin;

      if (error !== null) {
        marvin = fs.readFileSync(__dirname + '/images/' + imageName);
        error.send('error')
        console.log("stdout: " + stdout);
      } else {
        marvin = fs.readFileSync(__dirname + '/' + imageOutput);
      }

      var image = new Image;
      image.src = marvin;
      var canvas = new Canvas(image.width, image.height);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, image.width, image.height);

      var data = {'data':canvas.toDataURL(), 'width':image.width, 'height':image.height};
      socket.emit('image', data);
    });
  });
});


