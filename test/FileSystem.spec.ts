import FileSystem from '../src/FileSystem';
import Configuration from '../src/Configuration';
import * as fs from 'fs';
import { expect } from 'chai';
import * as path from 'path';
import { v1 as UID } from 'uuid';
import 'mocha';

const
    fileName = UID(),
    input = path.join( __dirname, "Assets", "test.mp4" );


describe( "Create filesystem",  () => {

    it( "Should not throw.", async() => {
        let
            err = null,
            setup = new Configuration({
                bucket: process.env.BUCKET || "mongoose-media-plugin-test",
                createBucket: true
            } ),
            config;

        try {
            await setup.Configure();
            config = await setup.Configure();
            new FileSystem(config)
        } catch (e) {
            err = e;
        }

        expect( err ).to.be.null;
    } ).timeout(10000)

} );

describe( "Move files", () => {

    it( "Should write", ( written ) => {

        ( async () => {
            let
                setup = new Configuration({
                    bucket: process.env.BUCKET || "mongoose-media-plugin-test",
                    createBucket: true
                }),
                config, s3fs, local, remote;

            try {
                await setup.Configure();
                config = await setup.Configure();
                s3fs = new FileSystem(config)
            } catch (e) {
                throw e;
            }

            local = fs.createReadStream( input );
            remote = s3fs.createWriteStream(`${fileName}.mp4`);

            local.pipe(remote);

            local.on( "error", ( e ) => written( e ) );
            remote.on( "error", ( e ) => written( e ) );

            remote.on("complete", () => {
                return written();
            } )
        })();

    } ).timeout(50000 );

    it( "Should read", ( done ) => {

        ( async () => {

            let
                setup = new Configuration({
                    bucket: process.env.BUCKET || "mongoose-media-plugin-test",
                    createBucket: true
                }),
                config, s3fs, local, remote;

            try {
                await setup.Configure();
                config = await setup.Configure();
                s3fs = new FileSystem(config)
            } catch (e) {
                throw e;
            }

            local = fs.createWriteStream(path.join(__dirname, `${fileName}.mp4`));
            remote = s3fs.createReadStream(`${fileName}.mp4`);

            remote.pipe(local);

            local.on( "error", ( e ) => done( e ) );
            remote.on( "error", ( e ) => done( e ) );

            local.on("finish", () => {
                fs.unlink( path.join(__dirname, `${fileName}.mp4` ), () => { return null } );
                return done();
            } )
        } )();

    } ).timeout(50000)

    it( "Should get link", ( done ) => {

        ( async () => {

            let
                setup = new Configuration({
                    bucket: process.env.BUCKET || "mongoose-media-plugin-test",
                    createBucket: true
                }),
                config, s3fs;

            try {
                await setup.Configure();
                config = await setup.Configure();
                s3fs = new FileSystem(config)
            } catch (e) {
                throw e;
            }

            expect( s3fs.getSignedURL( `${fileName}.mp4` ) ).to.have.string( "https" );
            return done();
        } )();

    } );

    it( "Should delete", ( done ) => {

        ( async () => {

            let
                setup = new Configuration({
                    bucket: process.env.BUCKET || "mongoose-media-plugin-test",
                    createBucket: true
                }),
                config, s3fs, result;

            try {
                await setup.Configure();
                config = await setup.Configure();
                s3fs = new FileSystem(config)
            } catch (e) {
                throw e;
            }

            result = await s3fs.unlink( `${fileName}.mp4` );
            expect( result ).to.be.true;
            done();
        } )();

    } ).timeout(50000);

    it( "Should fail to delete", ( done ) => {

        ( async () => {

            let
                setup = new Configuration({
                    bucket: process.env.BUCKET || "mongoose-media-plugin-test",
                    createBucket: true
                }),
                config, s3fs, result;

            try {
                await setup.Configure();
                config = await setup.Configure();
                s3fs = new FileSystem(config)
            } catch (e) {
                throw e;
            }

            result = await s3fs.unlink( "Bad path" );
            expect( result ).to.be.false;
            done();
        } )();

    } ).timeout(50000)

} );
