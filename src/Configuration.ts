import { S3, Credentials, Config as AWSConfig } from 'aws-sdk';

/**
 * @todo Enable other cloud providers ( Google Cloud / Azure )
 * @body Only AWS is currently supported.
 */

interface Config {
    AWS_ACCESS_KEY_ID?: string,
    AWS_SECRET_ACCESS_KEY?: string,
    bucket: string,
    types?: string[],
    region?: string,
    // processImages?: boolean
    // imageDimensions?: [ [ number, number ] ],
    // processVideos?: boolean,
    createBucket?:boolean;
    cache?:boolean;
    timeout?:number;
}

export default class Configuration {

    readonly AWS_ACCESS_KEY_ID: string;
    readonly AWS_SECRET_ACCESS_KEY: string;
    readonly bucket: string;
    readonly S3:S3;
    readonly AWS:AWSConfig;
    readonly region:string;
    readonly createBucket:boolean;
    readonly processImages?: boolean;
    readonly imageDimensions?: [ [ number, number ] ];
    readonly processVideos?: boolean;
    readonly types?:string[];
    public readonly cache:boolean = false;

    private verified: boolean;

    public Credentials: Credentials;
    public Bucket:any;

    constructor ( config:Config ) {

        this.AWS_ACCESS_KEY_ID = config.AWS_ACCESS_KEY_ID ? config.AWS_ACCESS_KEY_ID : process.env.AWS_ACCESS_KEY_ID;
        this.AWS_SECRET_ACCESS_KEY = config.AWS_SECRET_ACCESS_KEY
            ? config.AWS_SECRET_ACCESS_KEY
            : process.env.AWS_SECRET_ACCESS_KEY;

        this.bucket = config.bucket;
        this.region = config.region || 'us-east-1';
        this.types = ( config.types && Array.isArray(config.types) )
            ? config.types
            : [ "image/*", "video/mp4", "video/webm", "video/quicktime", "application/pdf", "text/*" ];

        /**
         * @todo Process media
         * @body Create resize images and normalise video content for web and compatibility ( webm + mp4 etc. ).
         */
        // this.processImages = config.processImages;
        // this.imageDimensions = config.imageDimensions;
        // this.processVideos = config.processVideos;
        this.createBucket = config.createBucket;

        if ( !this.AWS_ACCESS_KEY_ID || !this.AWS_SECRET_ACCESS_KEY ) {
            throw new Error(
                `Both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY need to be set,got
                AWS_ACCESS_KEY_ID=${this.AWS_ACCESS_KEY_ID} and AWS_SECRET_ACCESS_KEY=${this.AWS_SECRET_ACCESS_KEY}.
                Pass in arguments or in your env properties.`
            )
        }

        this.cache = config.cache || false;

        this.Credentials = new Credentials( this.AWS_ACCESS_KEY_ID, this.AWS_SECRET_ACCESS_KEY );

        this.AWS = new AWSConfig({
            credentials: this.Credentials,
            region: this.region,
            httpOptions: {
                timeout: config.timeout || 240000
            }
        } );

        this.S3 = new S3({
            apiVersion: '2006-03-01'
        } );
    }

    public async Configure():Promise<Configuration> {

        try {
            await this._verifyConfig();
            return this;
        }
        catch ( e ) {

            if ( e.statusCode === 403 ) {
                e.message = `Credentials are not authorised to access bucket: "${this.bucket}"`;
                throw e;
            }

            if ( e.statusCode === 404 && !this.createBucket ) {
                e.message = `Bucket "${this.bucket}" does not exist and 'createBucket' is not set.`;
                throw e;
            }

            if ( e.statusCode === 404 ) {
                await this._createBucket();
                return this.Configure();
            }

            throw e;
        }
    }

    private async _verifyConfig():Promise<any> {
        return new Promise( ( resolve, reject ) => {
            this.S3.headBucket({ Bucket: this.bucket }, (err, data) => {
                if (err) {
                    return reject( err );
                }
                this.verified = true;
                return resolve( data );
            });
        } );
    }

    private async _createBucket():Promise<any> {
        return new Promise( ( resolve, reject ) => {
            this.S3.createBucket({
                Bucket: this.bucket,
                ACL: "private"
            }, (err, data) => {
                if (err) {
                    return reject( err );
                }
                this.Bucket = data;
                return resolve( data );
            });
        } );
    }
}
