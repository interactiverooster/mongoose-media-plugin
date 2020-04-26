import mongoose from 'mongoose';
import Plugin from '../src/Plugin';
import Configuration from '../src/Configuration';
import * as fs from 'fs';
import { expect } from 'chai';
import * as path from 'path';
import { v1 as UID } from 'uuid';
import 'mocha';

const
    fileName = UID();

describe( "DB",  () => {

    let id;

    it( "Should insert", ( done ) => {

        ( async() => {

            await mongoose.connect( process.env.MONGOCONN || "mongodb://localhost:27017/test", { useNewUrlParser: true, useUnifiedTopology: true } );

            let
                setup = new Configuration({
                    bucket: process.env.BUCKET || "mongoose-media-plugin-test",
                    createBucket: true,
                    types: [ "image/*", "video/*", "/webm" ],
                    cache: true,
                    skipStreamInspection: false
                } ),
                Schema = mongoose.Schema( { name: { type: String } } ),
                config = await setup.Configure(),
                file = fs.createReadStream( path.join( __dirname, "./Assets/test.mp4" ) ),
                Model, doc;

            Schema.plugin( Plugin, config );

            Model = mongoose.model( "media", Schema );

            doc = new Model( {
                name: fileName,
                body: file
            } );

            id = doc._id;

            doc.save( ( err ) => {
                expect( err ).to.be.null;
                done();
            } );
        })()
    } ).timeout(50000);

    it( "Should be invalid", ( done ) => {
        ( async() => {
            let
                file = "String",
                Model = mongoose.model( "media" ),
                doc = new Model( {
                    name: fileName,
                    body: file
                } );

            doc.save( ( err ) => {
                expect( err ).to.not.be.null;
                done();
            } );
        })()
    } ).timeout(50000);


    it( "Should find", ( done ) => {
        let
            Model;

        Model = mongoose.model( "media" );
        Model.findOne( { _id: id } )
            .exec()
            .then( ( doc ) => {
                expect( doc.body ).to.not.be.null;
                return done();
            } )
            .catch( done );
    } ).timeout(50000);

    it( "Should be cached", ( done  => {
        expect( fs.existsSync( `/tmp/${id}` ) ).to.be.true;
        done();
    } ) ).timeout(50000);

    it( "Should update", ( done ) => {
        let
            Model;

        Model = mongoose.model( "media" );
        Model.findOne( { _id: id } )
            .exec()
            .then( ( doc ) => {
                expect( doc ).to.not.be.null;
                doc.name = "new name";
                doc.save( ( err, saved ) => {
                    expect( err ).to.be.null;
                    expect( saved.body ).to.not.be.null;
                    expect( saved.name ).to.equal( "new name" );
                    return done();
                } );
            } )
            .catch( done );
    } ).timeout(50000);

    it( "Should have content type", ( done ) => {
        let
            Model = mongoose.model( "media" );

        Model.findOne( { _id: id } )
            .exec()
            .then( ( doc ) => {
                expect( doc ).to.not.be.null;
                expect( doc.ContentType ).to.equal( "video/mp4" );
                return done();
            } )
    } );

    it( "Should change in content type", ( done ) => {
        let
            Model = mongoose.model( "media" );

        Model.findOne( { _id: id } )
            .exec()
            .then( ( doc ) => {
                expect( doc ).to.not.be.null;
                doc.body = fs.createReadStream( path.join( __dirname, "./Assets/test.webm" ) );
                doc.save( ( err, saved ) => {
                    expect( err ).to.be.null;
                    expect( saved.ContentType ).to.equal( "video/webm" );
                    return done();
                } );
            } )
    } ).timeout( 20000 );

    it( "Should be range", ( done ) => {
        let
            Model = mongoose.model( "media" );

        Model.findOne( { _id: id } )
            .exec()
            .then( ( doc ) => {

                expect( doc ).to.not.be.null;

                let
                    range = doc.range( "bytes=0-499" );

                expect( range ).to.not.be.null;
                return done();
            } )
    } ).timeout( 20000 );

    it( "Should be bad file type", ( done ) => {
        let
            Model = mongoose.model( "media" );

        Model.findOne( { _id: id } )
            .exec()
            .then( ( doc ) => {
                expect( doc ).to.not.be.null;
                doc.body = fs.createReadStream( path.join( __dirname, "./Assets/test.webm.zip" ) );
                doc.save( ( err ) => {
                    expect( err ).to.not.be.null;
                    return done();
                } );
            } )
    } ).timeout( 20000 );

    it( "Should remove", ( done ) => {

        let
            Model;

        Model = mongoose.model( "media" );
        Model.findOne( { _id: id } )
            .exec()
            .then( ( doc ) => {
                expect( doc ).to.not.be.null;
                doc.remove( ( err ) => {
                    expect( err ).to.be.null;
                    mongoose.disconnect();
                    return done();
                } );
            } )
            .catch( done );
    } ).timeout(50000);

} );
