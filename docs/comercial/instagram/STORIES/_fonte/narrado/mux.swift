import AVFoundation
let a=CommandLine.arguments; let video=URL(fileURLWithPath:a[1]); let out=URL(fileURLWithPath:a[2])
let starts=a[3].split(separator:",").map{Double($0)!}; let clips=a[4].split(separator:",").map{URL(fileURLWithPath:String($0))}
let comp=AVMutableComposition()
let v=AVURLAsset(url:video); let vt=v.tracks(withMediaType:.video)[0]
let cv=comp.addMutableTrack(withMediaType:.video,preferredTrackID:kCMPersistentTrackID_Invalid)!
try! cv.insertTimeRange(CMTimeRange(start:.zero,duration:v.duration),of:vt,at:.zero)
let ca=comp.addMutableTrack(withMediaType:.audio,preferredTrackID:kCMPersistentTrackID_Invalid)!
for (i,u) in clips.enumerated(){ let s=AVURLAsset(url:u); let t=s.tracks(withMediaType:.audio)[0]
  try! ca.insertTimeRange(CMTimeRange(start:.zero,duration:s.duration),of:t,at:CMTime(seconds:starts[i],preferredTimescale:600)) }
try? FileManager.default.removeItem(at:out)
let ex=AVAssetExportSession(asset:comp,presetName:AVAssetExportPresetHighestQuality)!; ex.outputURL=out; ex.outputFileType = .mp4
let sem=DispatchSemaphore(value:0); ex.exportAsynchronously{sem.signal()}; sem.wait(); print("export",ex.status.rawValue,ex.error?.localizedDescription ?? "")
