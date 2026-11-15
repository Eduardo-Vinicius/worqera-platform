import AVFoundation
import AppKit
let args=CommandLine.arguments; let dir=args[1]; let out=URL(fileURLWithPath:args[2]); let fps:Int32=30
try? FileManager.default.removeItem(at:out)
let files=try! FileManager.default.contentsOfDirectory(atPath:dir).filter{$0.hasSuffix(".jpg")}.sorted()
let W=1080,H=1920
let w=try! AVAssetWriter(outputURL:out,fileType:.mp4)
let input=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:W,AVVideoHeightKey:H,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:12_000_000,AVVideoProfileLevelKey:AVVideoProfileLevelH264HighAutoLevel]])
let ad=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32ARGB,kCVPixelBufferWidthKey as String:W,kCVPixelBufferHeightKey as String:H])
w.add(input); w.startWriting(); w.startSession(atSourceTime:.zero)
for (i,f) in files.enumerated(){
  let img=NSImage(contentsOfFile:dir+"/"+f)!; var r=CGRect(x:0,y:0,width:W,height:H)
  let cg=img.cgImage(forProposedRect:&r,context:nil,hints:nil)!
  var pb:CVPixelBuffer?; CVPixelBufferPoolCreatePixelBuffer(nil,ad.pixelBufferPool!,&pb)
  CVPixelBufferLockBaseAddress(pb!,[])
  let ctx=CGContext(data:CVPixelBufferGetBaseAddress(pb!),width:W,height:H,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(pb!),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)!
  ctx.draw(cg,in:CGRect(x:0,y:0,width:W,height:H)); CVPixelBufferUnlockBaseAddress(pb!,[])
  while !input.isReadyForMoreMediaData { usleep(2000) }
  ad.append(pb!,withPresentationTime:CMTime(value:CMTimeValue(i),timescale:fps))
}
input.markAsFinished(); let s=DispatchSemaphore(value:0); w.finishWriting{s.signal()}; s.wait(); print("ok",files.count,w.status.rawValue)
