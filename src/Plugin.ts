import Configuration from './Configuration';
import FileSystem from './FileSystem';
import { S3 } from 'aws-sdk';
import TypeStream from './StreamType';
import ReadStream from 'stream';
import mongoose from 'mongoose';
import mtype from 'stream-mmmagic';
import {bool} from "aws-sdk/clients/signer";

interface inspected {
    mime: {
        type: string,
        encoding: string
    },
    output:ReadStream
}

class MediaPlugin {

    readonly config:Configuration;
    readonly Schema:mongoose.Schema;
    readonly DB:mongoose;
    readonly FileSystem:FileSystem;
    readonly S3:S3;
    readonly mimeValidator:any;

    readonly fields:object[] = [
        { uploaded: { type: Date } },
        { created: { type: Date } },
        { updated: { type: Date, default: Date.now() } },
        { ETag: { type: String } },
        { Error: { type: String } },
        { ContentType: { type: String, default: "application/octet-stream" } },
        { Size: { type: Number, default: 0 } },
        { __Stream: { type: TypeStream, select: false } },
        { __pendingDelete: { type: Boolean, default: false } }
    ];

    constructor( schema:mongoose.Schema, config:Configuration ) {

        let
            self = this;

        this.config = config;
        this.Schema = schema;
        this.DB = mongoose;
        this.FileSystem = new FileSystem( config );

        this.Schema.options = { ...this.Schema.options, ...{ toObject: { virtuals: true } } };

        this.DB.Schema.Types.Stream = TypeStream;

        this.addFields();
        this.mimeValidator = this.makeMimeValidator();

        this.Schema.methods.range = function( range:string ) {
            return self.FileSystem.createReadStream( this._id.toString(), range );
        };

        this.Schema.pre( "save", function( next ) {

            if ( this.isNew ) {
                this.created = new Date();
            }
            else {
                this.updated = new Date();
            }

            return self.UpStream( this, next)
        } );

        this.Schema.pre( "remove", { document: true }, function( next ) {

            let
                doc = this;

            doc.__pendingDelete = true;
            doc.save( ( err, flagged ) => {

                if ( err ) {
                    return next( err );
                }

                self.FileSystem.unlink( flagged._id.toString() )
                    .then( () => {
                        return next();
                    } );
            } );
        } );

        this.Schema.virtual( "body" )
            .get( function() {
                if ( this.__pendingDelete ) {
                    return null;
                }
                return self.FileSystem.createReadStream( this._id.toString() );
            } )
            .set( function( v ) {
                this.__Stream = v;
            } );

    }

    private makeMimeValidator() {

        let mimeMap = {};

        this.config.types.map( ( type:string ) => {
            let
                media = type.split( "/" )[0],
                ext = type.split( "/" )[1];

            if ( !media || !ext ) {
                return;
            }

            if ( mimeMap[media] === "*" ) {
                return;
            }

            if ( !mimeMap[ media ] ) {
                if ( ext === "*" ) {
                    return mimeMap[ media ] = ext;
                }
                mimeMap[ media ] = [];
            }
            return mimeMap[ media ].push( ext );

        } );

        return function( type ):boolean {
            let
                media = type.split( "/" )[0],
                ext = type.split( "/" )[1];

            if ( !media || !ext ) {
                return false;
            }

            if ( !mimeMap[ media ] ) return false;
            if ( mimeMap[ media ] === "*" ) return true;

            return mimeMap[media].indexOf(ext) !== -1;
        }
    }

    private addFields() {
        this.fields.map( ( field ) => {
            this.Schema.add( field );
        } );
    }

    private UpStream( doc, next:any ) {

        let
            local, remote;

        if ( doc.isModified( "__Stream" ) ) {

            local = doc.__Stream;

            this.inspect( local )
                .then( ( result:inspected ) => this.checkMime( result, doc ) )
                .then( ( result:inspected ) => {

                    let options = null;

                    if ( result.mime ) {

                        options = {
                            ContentType: result.mime.type,
                            ContentEncoding: result.mime.encoding
                        };

                        doc.ContentType = result.mime.type;
                    }

                    remote = this.FileSystem.createWriteStream( doc._id.toString(), options );
                    result.output.pipe( remote );

                    remote.on( "error", ( err ) => {
                        return next( err );
                    } );

                    remote.on( "complete", ( data ) => {
                        doc.ETag = data.ETag;
                        doc.Size = data.size;
                        doc.uploaded = new Date();
                        doc.error = undefined;
                        doc.__Stream = undefined;
                        return next();
                    } );
                } )
                .catch( ( e ) => {
                    if ( local && local.close ) {
                        local.close();
                    }
                    return next( e );
                } )
        }
        else {
            return next();
        }
    }

    private checkMime( fileData:inspected, doc:any ) {
        return new Promise( ( accept, reject ) => {

            let valid = this.mimeValidator( fileData.mime.type );

            if ( valid ) {
                return accept( fileData );
            }

            return reject( new Error(
                `Stream interrupted as ${fileData.mime.type} ( ${doc.ContentType} in doc ),`+
                ` which is not accepted. Accepted file types are `+
                `${this.config.types.map( ( type ) => { return `${type}, ` } ) }. `
                )
            );
        } );
    }

    private inspect( input ) {
        return new Promise( ( accept, reject ) => {
            mtype(input, function (err, mime, output) {
                if (err) {
                    return reject( err );
                }

                return accept( {
                    mime: mime,
                    output: output
                } );
            });
        } );
    }
}

export default function( schema:mongoose.Schema, config:Configuration ) {
    return new MediaPlugin( schema, config );
};
