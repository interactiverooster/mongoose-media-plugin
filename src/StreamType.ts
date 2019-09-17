import mongoose from 'mongoose';
import ReadableStream from 'stream';

export default function Stream( key, options ) {
    return mongoose.SchemaType.call( this, key, options, 'ReadableStream' );
}

Stream.prototype = Object.create( mongoose.SchemaType.prototype );

Stream.prototype.cast = function( val:any ) {
  if ( !( val instanceof ReadableStream ) ) {
      throw new Error( "Not a readable stream." );
  }
  return val;
};
