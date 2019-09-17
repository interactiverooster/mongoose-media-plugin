# mongoose-media-plugin
[![Build Status](https://travis-ci.org/interactiverooster/mongoose-media-plugin.svg?branch=master)](https://travis-ci.org/interactiverooster/mongoose-media-plugin)
[![codecov](https://codecov.io/gh/interactiverooster/mongoose-media-plugin/branch/master/graph/badge.svg)](https://codecov.io/gh/interactiverooster/mongoose-media-plugin)
## Description
[Mongoose](https://mongoosejs.com/) plugin for managing [S3 files](https://aws.amazon.com/s3) as if they were stored in mongo.

Adds read and write stream capabilities to a mongo collection. The stream is offloaded to S3 during save.   

### Prerequisites

 You will need a aws account with full access to S3:
```json
///arn:aws:iam::aws:policy/AmazonS3FullAccess
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "s3:*",
            "Resource": "*"
        }
    ]
}
```
It is highly recommended you pass your AWS credentials via envoiroment vars
```sh
$ export AWS_ACCESS_KEY_ID=<your access key>
$ export AWS_SECRET_ACCESS_KEY=<your secret>
```

### Dependancies
```
node v10+
mongoose@5.*
```


### Installation

```sh
$ npm install mongoose-media-plugin
```

### Example usage
```typescript
import mongoose from 'mongoose';
import MMD, { Configuration } from 'mongoose-media-plugin';
import fs from 'fs';

const
    Schema = mongoose.Schema( {
        name: { type: String },
        //...restofschema
    } ),
    Setup = new Configuration({
        bucket: "<Bucket name>",
        createBucket: true // Set this to create the bucket if it  doesnt exist.
    } );

( async () => {

    await mongoose.connect( process.env.MONGOCONN || "mongodb://localhost:27017/mnp-example", { useNewUrlParser: true, useUnifiedTopology: true } );

    let
        config = await Setup.Configure(),
        local = fs.createReadStream( "<path to local file>" ),
        Media, Insert;

    Schema.plugin( MMP, config );
    Media = new mongoose.model( "media", Schema );

    Insert = new Media( {
        name: "first document",
        body: local
    } );
    
    Insert.save( ( err, saved ) => {
        console.log( err, saved );
        /**
        * Returns....
        * {
        *     _id: <ObjectId>
        *     name: "first document",
        *     ContentType: "video/mp4", //etc
        *     ETag: <S3 Etag>, //useful for setting cache see express example.
        *     Size: <size in bytes for file>,
        *     body: <ReadableStream> // from S3
        *     created: Date,
        *     updated: Date,
        *     uploaded: Date
        * }
        */
        
        // download the file...
        let download = fs.createWriteStream( "<path to new file>" );
        saved.body.pipe( download );
    } );
} )()
```
### Running the express [example](example/)

Ensure you have mongo running locally and install dependancies:
```sh
$ npm install
$ npm run build && npm run example
```

### Running the tests

Ensure you have mongo running locally and install dependancies:
```sh
$ npm install
$ npm test
```


### Authors

* **Dan Bowles** - [InteractiveRooster](https://github.com/interactverooster)

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
