/// <reference types="react/canary" />

import {
  ChangeEventHandler,
  FormEventHandler,
  Suspense,
  use,
  useCallback,
  useEffect,
  useState,
} from "react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

type Message = {
  id: string;
  from: "user" | "assistant";
  content?: string;
};

type Messages = Array<Message | Promise<Message>>;

export default function App() {
  const [messages, setMessages] = useState<Messages>([]);
  const [stream, setStream] = useState<ReadableStream>();
  const [input, setInput] = useState("");

  const handleInputChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (e) => setInput(e.target.value),
    []
  );

  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    (e) => {
      e.preventDefault();
      const userMessage: Message = {
        id: Date.now().toString(),
        from: "user",
        content: input,
      };
      const stream = fetchStreamingResponse(input);

      // Only one stream at a time can be read from.
      const [stream1, stream2] = stream.tee();
      setStream(stream1);

      const botMessage: Promise<Message> = new Promise((resolve) => {
        let text = "";
        const onData = (chunk: unknown) => {
          text += chunk as string;
        };
        readFromStream(stream2, onData).then(() =>
          resolve({
            id: Date.now().toString(),
            from: "assistant",
            content: text,
          })
        );
      });
      setMessages((messages) => [...messages, userMessage, botMessage]);
    },
    [setMessages, input]
  );

  return (
    <>
      <form onSubmit={handleSubmit}>
        <input type="text" value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
      <div role="log">
        {messages.map((message, index) => (
          <ErrorBoundary key={index} fallbackRender={ErrorRenderer}>
            <Suspense fallback={<MessageLoading stream={stream} />}>
              <MessageRenderer message={message} />
            </Suspense>
          </ErrorBoundary>
        ))}
      </div>
    </>
  );
}

function MessageLoading({ stream }: { stream?: ReadableStream }) {
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!stream || stream.locked) return;
    readFromStream(stream, (chunk) => {
      setContent((content) => content + (chunk as string));
    });
  }, [stream]);

  if (!stream) return "Loading...";
  return (
    <p style={{ color: "green" }}>
      <span>from bot: </span>
      <span>{content}</span>
    </p>
  );
}

function MessageRenderer({ message }: { message: Message | Promise<Message> }) {
  const { from, content } = message instanceof Promise ? use(message) : message;
  return (
    <p>
      <span>from {from}: </span>
      <span>{content}</span>
    </p>
  );
}

function ErrorRenderer({ error }: FallbackProps) {
  return (
    <div role="alert">
      <p>{error instanceof Error ? error.message : "Something went wrong"}</p>
    </div>
  );
}

function fetchStreamingResponse(message: string) {
  console.log("Message sent:", message);
  const lorem =
    "Lorem, ipsum dolor sit amet consectetur adipisicing elit. Repellat, odit sequi quibusdam delectus sapiente nesciunt cupiditate expedita tempora error nam inventore, odio fuga aperiam eaque quaerat veritatis asperiores vero voluptatem.";

  return new ReadableStream({
    async start(controller) {
      const chunks = lorem.split(" ");
      for (const chunk of chunks) {
        controller.enqueue(chunk + " ");
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      controller.close();
    },
  });
}

async function readFromStream(
  stream: ReadableStream,
  onData: (chunk: unknown) => void
) {
  const reader = stream.getReader();
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onData(value);
    }
  } catch (e) {
    console.error("Stream reading error:", e);
  } finally {
    reader.releaseLock();
  }
}
