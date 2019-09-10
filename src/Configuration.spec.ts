import Configuration from './Configuration';
import { expect } from 'chai';
import { S3, Credentials, Service } from "aws-sdk";
import { v1 as UID } from 'uuid';
import 'mocha';

describe( "Create configuration", () => {

    it( "Should have configuration.", () => {
        let
            id:string = process.env.AWS_ACCESS_KEY_ID,
            secret:string = process.env.AWS_SECRET_ACCESS_KEY,
            config = new Configuration( {
                AWS_ACCESS_KEY_ID: id,
                AWS_SECRET_ACCESS_KEY: secret,
                bucket: "test-bucket"
            } );
        expect( ( config.S3 instanceof Service ) ).to.be.true;
    } );

    it( "Should throw", () => {
        let
            err = null,
            id:string = process.env.AWS_ACCESS_KEY_ID,
            secret:string = process.env.AWS_SECRET_ACCESS_KEY;

        delete process.env.AWS_ACCESS_KEY_ID;
        delete process.env.AWS_SECRET_ACCESS_KEY;

        try {
            new Configuration( {
                AWS_ACCESS_KEY_ID: undefined,
                AWS_SECRET_ACCESS_KEY: undefined,
                bucket: "test-bucket"
            } );
        }
        catch ( e ) {
            err = e;
        }

        process.env.AWS_ACCESS_KEY_ID = id;
        process.env.AWS_SECRET_ACCESS_KEY = secret;

        expect( err ).to.not.be.null;
    } )
} );

describe( "Validate configuration", () => {

    const bucketName = UID();

    it( "Should be invalid", async () => {
        let
            err = null,
            id:string = "BAD_ID",
            secret:string = "BAD_SECRET",
            config = new Configuration( {
                AWS_ACCESS_KEY_ID: id,
                AWS_SECRET_ACCESS_KEY: secret,
                bucket: "test-bucket"
            } );

        try {
            await config.Configure();
        } catch (e) {
            err = e;
        }
        expect( err.statusCode ).to.equal( 403 );
    } );

    it( "Should be missing", async () => {
        let
            err = null,
            id:string = process.env.AWS_ACCESS_KEY_ID,
            secret:string = process.env.AWS_SECRET_ACCESS_KEY,
            config = new Configuration( {
                AWS_ACCESS_KEY_ID: id,
                AWS_SECRET_ACCESS_KEY: secret,
                bucket: bucketName
            } );

        try {
            await config.Configure();
        } catch (e) {
            err = e;
        }

        expect( err.statusCode ).to.equal( 404 );
    } );

    it( "Should be created", async () => {
        let
            err = null,
            id:string = process.env.AWS_ACCESS_KEY_ID,
            secret:string = process.env.AWS_SECRET_ACCESS_KEY,
            config = new Configuration( {
                AWS_ACCESS_KEY_ID: id,
                AWS_SECRET_ACCESS_KEY: secret,
                bucket: bucketName,
                createBucket: true
            } );

        try {
            await config.Configure();
        } catch (e) {
            err = e;
        }

        expect( err ).to.not.be.null;
    } );
} );


