const
    express = require( "express" ),
    path = require( "path" ),
    mongoose = require( "mongoose" ),
    MMP = require( "../lib/index" ).Plugin,
    Configuration = require( "../lib/index" ).Configuration,
    BusBoy = require( "connect-busboy" ),
    App = express(),
    fs = require( "fs" ),
    PORT = process.env.PORT || 3000,
    Schema = mongoose.Schema( {
        name: { type: String }
    } ),
    Setup = new Configuration({
        bucket: "mmp-test-buck",
        createBucket: true
    } );

( async () => {

    await mongoose.connect( process.env.MONGOCONN || "mongodb://localhost:27017/mnp-example", { useNewUrlParser: true, useUnifiedTopology: true } );

    let
        config = await Setup.Configure(),
        Media;

    Schema.plugin( MMP, config );

    Media = new mongoose.model( "media", Schema );

    App.use( express.static( path.join( __dirname, './public' ) ) );

    App.use(BusBoy({
        highWaterMark: 32 * 1024
    }));

    App.get( "/media/:id", ( req, res, next ) => {
        Media.findOne( { _id: req.params.id } )
            .exec()
            .then( ( file ) => {

                if ( req.headers[ 'if-none-match' ] === file.ETag ) {

                    res.writeHead(304, {
                        'Last-Modified': new Date( file.uploaded ).toUTCString(),
                        'Content-Length': file.Size,
                        'Content-Type': file.ContentType,
                        'Cache-Control': 'public, max-age=31557600, s-maxage=31557600',
                        'ETag': file.ETag
                    } );

                    return res.end();
                }

                if ( !file ) {
                    return next( new Error( `File '${req.params.id}' not found.` ) );
                }

                let
                    range = req.headers.range;

                if (range) {
                    let
                        parts = range.replace(/bytes=/, "").split("-"),
                        start = parseInt(parts[0], 10),
                        end = ( parts[1] ? parseInt(parts[1], 10) : file.Size-1 ),
                        chunksize = (end-start)+1,
                        head = {
                            'Content-Range': `bytes ${start}-${end}/${file.Size}`,
                            'Accept-Ranges': 'bytes',
                            'Content-Length': chunksize,
                            'Content-Type': file.ContentType,
                            'Cache-Control': 'public, max-age=31557600, s-maxage=31557600',
                            'ETag': file.ETag
                        };

                    res.writeHead(206, head);
                    return file.range( range ).pipe(res);
                } else {
                    res.writeHead(200, {
                        'Content-Length': file.Size,
                        'Content-Type': file.ContentType,
                        'Cache-Control': 'public, max-age=31557600, s-maxage=31557600',
                        'ETag': file.ETag
                    });
                    return file.body.pipe(res)
                }
            } )
            .catch( next );
    } );

    App.get( "/download/:id", ( req, res, next ) => {
        Media.findOne( { _id: req.params.id } )
            .exec()
            .then( ( file ) => {
                if ( !file ) {
                    return next( new Error( `File '${req.params.id}' not found.` ) );
                }

                res.writeHead(200, {
                    'Content-Length': file.Size,
                    'Content-Type': file.ContentType,
                    'Content-Disposition': `attachment; filename="${file.name}"`
                });

                return file.body.pipe(res)
            } )
            .catch( next );
    } );

    App.get( "/delete/:id", ( req, res, next ) => {
        Media.findOne( { _id: req.params.id } )
            .exec()
            .then( ( file ) => {
                    if ( !file ) {
                        return next( new Error( `File '${req.params.id}' not found.` ) );
                    }

                    file.remove()
                        .then( ( done ) => {
                            return res.json( done );
                        } )
                        .catch( next );
            } )
            .catch( next );
    } );

    App.get( "/latest", ( req, res ) => {
        Media.find( {} )
            .sort( { created: -1 } )
            .lean()
            .exec()
            .then( ( medias ) => {
                return res.json( medias );
            } )
    } );

    App.post( "/", ( req, res, next ) => {

        req.setTimeout( 60*60*1000 ); //1hr time out for large files.

        req.pipe(req.busboy); // Pipe it trough busboy
        req.busboy.on( 'file', (fieldname, file, filename) => {

            let
                doc = new Media( {
                    name: filename,
                    body: file
                } );

            doc.save( ( err, saved ) => {
                if ( err ) {
                    return res.status(500).json({ code: 500, error: err.message })
                }
                return res.json( saved.toJSON() );
            } );
        })
    } );

} )();

App.listen( PORT, () => {
    console.log( `Server listening... http://localhost:${PORT}`, process.pid );
} );
