const AWS = require('aws-sdk');
const S3 = new AWS.S3({
  signatureVersion: 'v4',
});
const Sharp = require('sharp');

exports.handler = function (event, context, callback) {
    'use strict';
    let crops = event.crops
    let bucket = event.bucket
    let fileKey = event.fileKey

    S3.getObject({Bucket: bucket, Key: fileKey}).promise()
        .then(
            file => Promise.all(crops.map(_crop => {
                return Sharp(file.Body)
                .resize(_crop.width, _crop.height)
                .toFormat(_crop.format)
                .toBuffer()
                .then(_buffer => {
                    return { 
                        config: _crop,
                        buffer: _buffer
                    }
                })
            }))
        )
        .then(_croppedFiles => {
            return Promise.all(_croppedFiles.map(_cropFile => {
                return  S3.putObject({
                    Body: _cropFile.buffer,
                    Bucket: bucket,
                    ContentType: _cropFile.config.contentType,
                    Key: _cropFile.config.folder+fileKey
                }).promise()                        
            }))

        })
        .then(callback(null, {result: 'ok'}))
        .catch(err => console.log(err))
};

