import fastifyCors from "@fastify/cors"
import fastify from "fastify"
import { createTranscriptionRoute } from "./routes/create-transcription"
import { generateAiCompletionsRoute } from "./routes/generate-ai-completion"
import { getAllPromptsRoute } from "./routes/get-all-prompts"
import { uploadVideoRoute } from "./routes/upload-video"

const app = fastify()

app.register(fastifyCors, { origin: "*" })

app.register(getAllPromptsRoute)
app.register(uploadVideoRoute)
app.register(createTranscriptionRoute)
app.register(generateAiCompletionsRoute)

app.listen({ port: 3333 }).then(() => {
  console.log("Server is running on port 3333")
})
