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
  id: string;
  from: "user" | "assistant";
  content: string;
};

type Messages = Array<Message | Promise<Message>>;

export default function App() {
  const [messages, setMessages] = useState<Messages>([]);
  const [input, setInput] = useState("");

  const handleInputChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (e) => setInput(e.target.value),
    []
  );

  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    (e) => {
      e.preventDefault();
      const question: Message = {
        id: Date.now().toString(),
        from: "user",
        content: input,
      };
      const response: Promise<Message> = fetchResponse(input).then(
        (response) => ({
          id: Date.now().toString(),
          from: "assistant",
          content: response,
        })
      );
      setMessages((messages) => [...messages, question, response]);
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
            <Suspense fallback="Loading...">
              <MessageRenderer message={message} />
            </Suspense>
          </ErrorBoundary>
        ))}
      </div>
    </>
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

async function fetchResponse(message: string): Promise<string> {
  return new Promise((resolve) =>
    setTimeout(() => {
      console.log("Message sent:", message);
      resolve("I don't know");
    }, 1000)
  );
}
