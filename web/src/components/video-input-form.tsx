import { api } from "@/lib/axios"
import { getFFmpeg } from "@/lib/ffmpeg"
import { fetchFile } from "@ffmpeg/util"
import { CheckCircle, FileVideo, Upload } from "lucide-react"
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { Separator } from "./ui/separator"
import { Textarea } from "./ui/textarea"

type Status =
  | "waiting"
  | "converting"
  | "uploading"
  | "generating"
  | "success"
  | "error"

const statusMessages = {
  converting: "Convertendo...",
  generating: "Transcrevendo...",
  uploading: "Carregando...",
  success: "Sucesso!",
  error: "Ocorreu um erro durante o processo.",
}

interface VideoInputFormProps {
  onVideoUploaded: (id: string) => void
}

export function VideoInputForm(props: VideoInputFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>("waiting")

  const promptInputRef = useRef<HTMLTextAreaElement>(null)

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.currentTarget

    if (!files) return

    const selectedFile = files[0]

    setVideoFile(selectedFile)
  }

  async function convertVideoToAudio(video: File) {
    console.log("Convert started.")

    try {
      const ffmpeg = await getFFmpeg()

      await ffmpeg.writeFile("input.mp4", await fetchFile(video))

      ffmpeg.on("progress", (progress) => {
        console.log("Convert progress: " + Math.round(progress.progress * 100))
      })

      await ffmpeg.exec([
        "-i",
        "input.mp4",
        "-map",
        "0:a",
        "-b:a",
        "20k",
        "-acodec",
        "libmp3lame",
        "output.mp3",
      ])

      const data = await ffmpeg.readFile("output.mp3")

      const audioFileBlob = new Blob([data], { type: "audio/mpeg" })
      const audioFile = new File([audioFileBlob], "audio.mp3", {
        type: "audio/mpeg",
      })

      console.log("Convert finished.")

      return audioFile
    } catch (error) {
      setStatus("error")
      console.error("An error occurred while converting the file.", error)
      throw error
    }
  }

  async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const prompt = promptInputRef.current?.value

    if (!videoFile) return

    setStatus("converting")

    try {
      const audioFile = await convertVideoToAudio(videoFile)

      const data = new FormData()

      data.append("file", audioFile)

      setStatus("uploading")

      const response = await api.post("/videos", data)

      const videoId = response.data.video.id

      setStatus("generating")

      await api.post(`/videos/${videoId}/transcription`, {
        prompt,
      })

      setStatus("success")

      props.onVideoUploaded(videoId)

      setTimeout(() => {
        setStatus("waiting")
      }, 7000) // 7 seconds
    } catch (error) {
      setStatus("error")
      console.error("An error occurred during the file upload process.", error)
      throw error
    }
  }

  const previewUrl = useMemo(() => {
    if (!videoFile) return null

    return URL.createObjectURL(videoFile)
  }, [videoFile])

  return (
    <form onSubmit={handleUploadVideo} className="space-y-6">
      <label
        htmlFor="video"
        className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5"
      >
        {previewUrl ? (
          <video
            src={previewUrl}
            controls={false}
            className="object-fill h-[180px] w-80 pointer-events-none absolute inset-0"
          />
        ) : (
          <>
            <FileVideo className="w-4 h-4" />
            Selecione um vídeo
          </>
        )}
      </label>

      <input
        type="file"
        id="video"
        accept="video/mp4"
        className="sr-only"
        onChange={handleFileSelected}
      />

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
        <Textarea
          ref={promptInputRef}
          disabled={status !== "waiting"}
          id="transcription_prompt"
          className="h-20 leading-relaxed resize-none"
          placeholder="Inclua palavras-chave mencionadas no vídeo separada por vírgula (,)"
        />
      </div>

      <Button
        data-success={status === "success"}
        disabled={status !== "waiting"}
        type="submit"
        className="w-full data-[success=true]:bg-emerald-400"
      >
        {status === "waiting" ? (
          <>
            Carregar vídeo
            <Upload className="w-4 h-4 ml-2" />
          </>
        ) : (
          statusMessages[status]
        )}
        {status === "success" && <CheckCircle className="w-4 h-4 ml-2" />}
      </Button>
    </form>
  )
}