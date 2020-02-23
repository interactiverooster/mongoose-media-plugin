import Configuration from './Configuration';
import { S3 } from 'aws-sdk'
import * as fs from "fs";
import * as stream from "stream";

class MockStream extends stream.PassThrough {

    readonly S3:S3;
    readonly bucket:string;
    readonly key:string;
    readonly options:object;

    constructor( s3:S3, Bucket:string, Key:string, options?:object ) {
        super();

        this.S3 = s3;
        this.bucket = Bucket;
        this.key = Key;
        this.options = options || {};

        let
            length:number = 0;

        this.S3.upload({
            Bucket: this.bucket,
            Key: this.key,
            Body: this,
            ...this.options
        }, ( err, data:any ) => {
            if ( err ) {
                this.emit( "error", err );
            }
            else {
                data.size = length;
                this.emit( "complete", data );
            }
        } );

        this.on( "data", ( data ) => {
            length += data.length;
        } );
    }
}

/**
 * @todo Create local cache option
 * @body Makes sense and would improve performance / network costs to provide a local cache option xxGB/MB etc for frequently used files.
 */
export default class FileSystem {

    readonly bucket:string;
    readonly S3:S3;
    readonly useCache:boolean;

    constructor( Connector:Configuration ) {
        this.bucket = Connector.bucket;
        this.S3 = Connector.S3;
        this.useCache = Connector.cache;
    }

    private checkLocalCache( key ) {
        return fs.existsSync( `/tmp/${key}` );
    }

    public createReadStream( key:string, range?:string ):stream.Readable {

        let
            params:any = {
                Bucket: this.bucket,
                Key: key,
            };

        if ( range ) {
            params.Range = range;
        }

        if ( this.useCache ) {

            if ( this.checkLocalCache( key ) ) {
                return fs.createReadStream( `/tmp/${key}` );
            }

            const
                readStream = this.S3.getObject( params ).createReadStream(),
                writeStream = fs.createWriteStream( '/tmp/${key' );

            readStream.pipe( writeStream );
        }

        return this.S3.getObject( params ).createReadStream();
    }

    public createWriteStream( key:string, options?:object ):MockStream {
        if ( this.useCache ) {
            if (this.checkLocalCache(key)) {
                fs.unlinkSync( `/tmp/${key}`)
            }
        }
        return new MockStream( this.S3, this.bucket, key, options );
    }

    public head( key ) {
        return new Promise( ( resolve, reject ) => {
            this.S3.headObject( { Bucket: this.bucket, Key: key  }, ( err ) => {
                if (err) {
                    return reject();
                }
                return resolve();
            } )
        } )
    }

    public async unlink( key:string ):Promise<boolean> {
        return new Promise( ( resolve ) => {
            this.head( key )
                .then( () => {
                    this.S3.deleteObject( { Bucket: this.bucket, Key: key }, () => {
                        return resolve( true );
                    } );
                })
                .catch( ( e ) => {
                    resolve( false );
                } );
        } );
    }

    public getSignedURL( key:string, expiry?:number ) {
        return this.S3.getSignedUrl( "getObject", { Bucket: this.bucket, Key: key, Expires: expiry || 900 } );
    }
}
