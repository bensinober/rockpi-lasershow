/*
  Code from https://github.com/possan/ilda.js
  Modified for ES2016 module usage
*/

var ILDA = {}
ILDA.version = "ILDA.JS"

const BlankingBit = 1 << 14
const LastBit = 1 << 15

// ANIMATION

/*

var SegmentTypes = {
  UNKNOWN: 1
}

var Segment = function() {
  this.type = SegmentTypes.UNKNOWN;
}

var Frame = function() {
  this.segments = [];
}

Frame.prototype.clone = function() {
  var f = new Frame();
  for (var s in this.segments) {
    f.segments.push({

    });
  }
  return f;
}

var Animation = function() {
  this.framerate = 15;
  this.frames = [];
}

Animation.prototype.append = function(data) {
  if (typeof(data) == typeof(Animation)) {
    for (frame in anim.frames) {
      this.frames.push(frame.clone());
    }
  }
  else if (typeof(data) == typeof(Frame)) {
    this.frames.push(frame.clone());
  }
}


ILDA['Frame'] = Frame;
ILDA['Animation'] = Animation;

*/

const SectionTypes = {
  THREE_DIMENSIONAL_INDEXED:    0,
  TWO_DIMENSIONAL_INDEXED:      1,
  COLOR_TABLE:                  2,

  THREE_DIMENSIONAL_TRUECOLOR:  4,
  TWO_DIMENSIONAL_TRUECOLOR:    5,
  UNKNOWN:                      99,
}

var Point = function() {
  this.x = 0
  this.y = 0
  this.z = 0
  this.color = 0
  this.blanking = false
  this.last = false
}

ILDA.Point = Point

var Color = function() {
  this.r = 0
  this.g = 0
  this.b = 0
}

ILDA.Color = Color

var Section = function() {
  this.type =    SectionTypes.UNKNOWN
  this.name =    "" // palette name or frame name
  this.company = ""
  this.index =   0 // palette number or frame number
  this.points =  [] // points contains x,y,z,color,blanking and last fields
  this.head =    0
  this.total =   0
  this.colors =  [] // colors contains r,g,b values
}

var File = function() {
  this.sections = []
}

ILDA.Section = Section
ILDA.SectionTypes = SectionTypes
ILDA.File = File

/////////
// READER
/////////

var Reader = {}
Reader.readFromBuffer = function(buf) {
  console.log(buf.byteLength)
  const view = new DataView(buf) // general buffer view
  let f = new File()
  f.sections = []

  var idx = 0
  let headView = new Uint8Array(buf, idx, 4)
  const header = new TextDecoder().decode(headView)
  if (header !== "ILDA") {
    console.log("WRONG HEADER, aborting!")
    return
  }
  while (idx < 32) { // header
    let section = new Section()
    idx += 7
    section.type = view.getUint8(idx)
    idx += 1
    let nameView = new Uint8Array(buf, idx, 8)
    section.name = new TextDecoder().decode(nameView)
    idx += 8
    let compView = new Uint8Array(buf, idx, 8)
    section.company = new TextDecoder().decode(compView)
    idx += 8
    const np = view.getUint16(idx)      // number of records
    idx += 2
    section.index = view.getUint16(idx) // idx of this frame
    idx += 2
    section.total = view.getUint16(idx) // total frames
    idx += 2
    section.head = view.getUint8(idx)
    idx += 1
    idx += 1 // ignore last - NOOP


    switch(section.type) {
      case SectionTypes.THREE_DIMENSIONAL_INDEXED:
      case SectionTypes.TWO_DIMENSIONAL_INDEXED:
      case SectionTypes.THREE_DIMENSIONAL_TRUECOLOR:
      case SectionTypes.TWO_DIMENSIONAL_TRUECOLOR:
        // Points : read Data frame
        for (var i=0; i<np; i++) {
          let point = new Point()
          var st
          point.x = view.getInt16(idx)
          idx += 2
          point.y = view.getInt16(idx)
          idx += 2
          // Points
          // types 0 or 4 are 3D
          if (section.type === SectionTypes.THREE_DIMENSIONAL_INDEXED || section.type === SectionTypes.THREE_DIMENSIONAL_TRUECOLOR) {
            point.z = view.getInt16(idx)
            idx += 2
            st = view.getUint8(idx)
            idx += 1
          // types 1 or 5 are 2D
          } else if (SectionTypes.TWO_DIMENSIONAL_INDEXED === 1 || SectionTypes.TWO_DIMENSIONAL_TRUECOLOR === 5) {
            st = view.getUint8(idx)
            idx += 1
          }

          // Colors
          // types 0 and 1 are indexed colour
          if (SectionTypes.THREE_DIMENSIONAL_INDEXED === 0 || SectionTypes.TWO_DIMENSIONAL_INDEXED === 1) {
            point.color = view.getUint8(idx)
            idx += 1
          // types 4 and 5 are true colour
          } else if (SectionTypes.THREE_DIMENSIONAL_TRUECOLOR === 4 || SectionTypes.TWO_DIMENSIONAL_TRUECOLOR === 5) {
            let color = new Color()
            color.b = view.getUint8(idx)
            idx += 1
            color.g = view.getUint8(idx)
            idx += 1
            color.r = view.getUint8(idx)
            idx += 1
            section.colors.push(color)
            point.color = section.colors.length
          }
          point.blanking = (st & 0x40) === 0x40
          point.last = (st & 0x80) === 0x80
          section.points.push(point)
        }
        break

      case SectionTypes.COLOR_TABLE:
        for (var i=0; i<np; i++) {
          var color = new Color()
          color.r = view.getUint8(idx)
          idx += 1
          color.g = view.getUint8(idx)
          idx += 1
          color.b = view.getUint8(idx)
          idx += 1
          section.colors.push(color)
        }
        break
      }
    f.sections.push(section)
  }
  return f
}

ILDA.Reader = Reader

//////////
// WRITER
// TODO: rewrite
//////////

var Writer = function(anim) {
  this.animation = anim || new Animation();
}

Writer.prototype.addAnimation = function(anim) {
  for (frame in anim.frames) {
    this.addFrame(frame);
  }
}

Writer.prototype.addFrame = function(frame) {
  this.animation.addFrame(frame);
}

var ArrayWriter = function() {
  this.bytes = [];
}

ArrayWriter.prototype.writeByte = function(value) {
  this.bytes.push(value);
};

ArrayWriter.prototype.writeShort = function(value) {
  this.writeByte((value >> 8) & 0xFF);
  this.writeByte((value >> 0) & 0xFF);
};

ArrayWriter.prototype.writeSignedShort = function(value) {
  if (value < 0)
    value = 65535 + value;
  this.writeByte((value >> 8) & 0xFF);
  this.writeByte((value >> 0) & 0xFF);
};

ArrayWriter.prototype.writeLong = function(value) {
  this.writeByte((value >> 24) & 0xFF);
  this.writeByte((value >> 16) & 0xFF);
  this.writeByte((value >> 8) & 0xFF);
  this.writeByte((value >> 0) & 0xFF);
};

ArrayWriter.prototype.writeString = function(string, len) {
  for (var i=0; i<len; i++) {
    if (i < string.length)
      this.writeByte(string.charCodeAt(i));
    else
      this.writeByte(0);
  }
}

Writer.toByteArray = function(file, callback) {
  var p = new ArrayWriter();
  for(var si in file.sections) {
    var section = file.sections[si];
    switch(section.type) {
      case SectionTypes.THREE_DIMENSIONAL:
        // 3d frame
        p.writeString('ILDA', 4);
        p.writeLong(section.type);
        p.writeString(section.name, 8);
        p.writeString(section.company, 8);
        p.writeShort(section.points.length);
        p.writeShort(section.index);
        p.writeShort(section.total);
        p.writeByte(section.head);
        p.writeByte(0);
        for(var i=0; i<section.points.length; i++) {
          var point = section.points[i];
          p.writeSignedShort(point.x);
          p.writeSignedShort(point.y);
          p.writeSignedShort(point.z);
          var st = 0;
          st |= (point.color & 0x7F);
          if (point.blanking)
            st |= BlankingBit;
          if (point.last || i == section.points.length-1)
            st |= LastBit;
          p.writeShort(st);
        }
        break;
      case SectionTypes.TWO_DIMENSIONAL:
        // 2d frame
        p.writeString('ILDA', 4);
        p.writeLong(section.type);
        p.writeString(section.name, 8);
        p.writeString(section.company, 8);
        p.writeShort(section.points.length);
        p.writeShort(section.index);
        p.writeShort(section.total);
        p.writeByte(section.head);
        p.writeByte(0);
        for(var i=0; i<section.points.length; i++) {
          var point = section.points[i];
          p.writeSignedShort(point.x);
          p.writeSignedShort(point.y);
          var st = 0;
          st |= (point.color & 0x7F);
          if (point.blanking)
            st |= BlankingBit;
          if (point.last || i == section.points.length-1)
            st |= LastBit;
          p.writeShort(st);
        }
        break;
      case SectionTypes.COLOR_TABLE:
        // color palette
        p.writeString('ILDA', 4);
        p.writeLong(section.type);
        p.writeString(section.name, 8);
        p.writeString(section.company, 8);
        p.writeShort(section.colors.length);
        p.writeShort(section.index);
        p.writeByte(0);
        p.writeByte(0);
        p.writeByte(section.head);
        p.writeByte(0);
        for(var i=0; i<section.colors.length; i++) {
          var color = section.colors[i];
          p.writeByte(color.r);
          p.writeByte(color.g);
          p.writeByte(color.b);
        }
        break;
      case SectionTypes.TRUECOLOR_TABLE:
        // truecolor
        p.writeString('ILDA', 4);
        p.writeLong(section.type);
        p.writeLong(section.colors.length * 3 + 4);
        p.writeLong(section.colors.length);
        for(var i=0; i<section.colors.length; i++) {
          var color = section.colors[i];
          p.writeByte(color.r);
          p.writeByte(color.g);
          p.writeByte(color.b);
        }
        break;
    }
  }
  callback(p.bytes);
}

ILDA.Writer = Writer

//////////
// UTILS
//////////

var Utils = {}

ILDA.Utils = Utils

export { ILDA }
