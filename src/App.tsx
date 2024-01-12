/// <reference types="react/canary" />

import {
  ChangeEventHandler,
  FormEventHandler,
  Suspense,
  useCallback,
  useState,
  use,
} from "react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

type Message = {
  from: "user" | "assistant";
  messageId: string;
  sessionId: string;
  content: string;
};

type LazyMessage = Promise<Message>;

export default function App() {
  const [messages, setMessages] = useState<(Message | LazyMessage)[]>([]);
  const [input, setInput] = useState("");

  const handleInputChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (e) => setInput(e.target.value),
    []
  );

  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    (e) => {
      e.preventDefault();
      const question: Message = {
        from: "user",
        messageId: "1",
        sessionId: "1",
        content: input,
      };
      const response: LazyMessage = fetchResponse(input).then((response) => {
        return {
          from: "assistant",
          content: response,
          sessionId: "1",
          messageId: "2",
        };
      });
      setMessages((messages) => [...messages, question, response]);
    },
    [setMessages, input]
  );

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="text" value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
      <div role="log">
        {messages.map((message, index) => (
          <ErrorBoundary key={index} fallbackRender={MessageError}>
            <Suspense fallback={<MessageLoading />} key={index}>
              <MessageComponent message={message} />
            </Suspense>
          </ErrorBoundary>
        ))}
      </div>
    </div>
  );
}

function MessageError({ error }: FallbackProps) {
  return (
    <p>
      <span>Error:</span>
      {error instanceof Error ? error.message : "Unknown error"}
    </p>
  );
}

function MessageLoading() {
  return <p>Loading...</p>;
}

function MessageComponent({ message }: { message: Message | LazyMessage }) {
  const { from, content } = message instanceof Promise ? use(message) : message;
  return (
    <p>
      <span>from {from}: </span>
      <span>{content}</span>
    </p>
  );
}

async function fetchResponse(question: string): Promise<string> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      const random = Math.random();
      if (random < 0.5) return reject(new Error("Something went wrong"));
      resolve(question); // parrot
    }, 5000)
  );
}
