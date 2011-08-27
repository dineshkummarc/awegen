var sys = require("sys")
  , fs = require('fs')
  , express = require('express')
  , io = require('socket.io')
  , Canvas = require('canvas')
  , Image = Canvas.Image
  , exec = require("child_process").exec
  , form = require('connect-form');

var app = express.createServer(express.logger());
var server = io.listen(app);

app.get('/', function(request, response) {
    response.sendfile(__dirname + '/index.html');
});

app.get('/upload', function(request, response) {
    response.send('<form method="post" enctype="multipart/form-data">'
        + '<p>Image: <input type="file" name="image" /></p>'
        + '<p><input type="submit" value="Upload" /></p>'
        + '</form>');
});

app.post('/upload', function(request, response, next) {
    request.form.complete(function(err, fields, files) {
        if (err) {
            next(err);
        } else {
            console.log('\nuploaded %s to %s'
            ,  files.image.filename
            , files.image.path);
            res.redirect('back');
        }
    });

    request.form.on('progress', function(bytesReceived, bytesExpected) {
        var percent = (bytesReceived / bytesExpected * 100) | 0;
        process.stdout.write('Uploading: %' + percent + '\r');
    });
});

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
    var imageOutput = "output/" + new Date().getTime() + imageName
    var convert_params = json_message + " images/" + imageOutput

    child = exec("convert " + convert_params, function (error, stdout, stderr) {
      console.log("stdout: " + stdout);
      console.log("stderr: " + stderr);

      var marvin = fs.readFileSync(__dirname + '/images/' + imageOutput);

      if (error !== null) {
        marvin = fs.readFileSync(__dirname + '/images/' + imageName);
        console.log("stdout: " + stdout);
      }

      var image = new Image;
      image.src = marvin;
      var canvas = new Canvas(image.width, image.height);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, image.width, image.height);

      var data = '<img src="' + canvas.toDataURL() + '"/>';
      socket.emit('image', data);
    });
  });
});


