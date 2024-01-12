# Better LLM Chatbots with React Suspense 🌀

AI Chatbots are a bit weird. When a user sends a message, its content is displayed instantaneously. In contrast, the chatbot's response requires an API request to be processed before any reply is displayed.

This imbalance can be a bit confusing to work with. Finding a way to handle both sync and async messages in a similar way is trivial. Thankfully, with [Suspense](https://react.dev/reference/react/Suspense) we can do it with ease.

> The solution I'm proposing depends on some features that have not been released on a stable version of React yet. Use at your own risk.

---

Let's start by defining a `Message` type:

```tsx
type Message = {
  from: "user" | "bot";
  id: string;
  content: string;
}
```

Pretty straightforward. Now, since the bot message will be created asynchronously, we can use a `Promise` to represent it. Let's then declare a `Messages` type that will inform our application about that messages could be either a message or a promise that resolves to a message:

```tsx
type Messages = Array<Message | Promise<Message>>;
```

Then, let's create a simple component that contains a form that allows the user to send a message:

```tsx
function Chatbot() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Messages>([]);
  
  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    (e) => {
      e.preventDefault();
      // 1. Create message with the user's input
      // 2. Create a promise that resolves to the bot's response
      // 3. Update messages state to include both messages
    },
    [setMessages, input]
  );
  
  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="text" value={input} onChange={handleInputChange} required />
        <button type="submit">Send</button>
      </form>
      {/* the messages will be rendered here below */}
    </div>
  )
}
```

Now, let's complete the body of the `handleSubmit` function:

*Step 1* is easy, we just need to create a `Message` with the user's input:

```tsx
// 1. Create message with the user's input
const userMessage: Message = {
  from: "user",
  id: Date.now().toString(),
  content: input,
};
```

**Step 2** requires a bit more work. We need to create a function that will fetch the bot's response. For the sake of simplicity, let's just create a function that returns a promise that resolves to a string:

```tsx
async function fetchResponse(message: string): Promise<string> {
  return new Promise((resolve) =>
    setTimeout(() => {
      console.log("Message sent:", message);
      resolve("I don't know");
    }, 1000)
  );
}
```

Then, we can use this function to create a promise that resolves to a `Message` with the bot's response:

```tsx
// 2. Create a promise that resolves to the bot's response
const botMessage: Promise<Message> = fetchResponse(input).then((response) => ({
  from: "bot",
  id: Date.now().toString(),
  content: response,
}));
```

Finally, we can add both messages to the state:

```tsx
// 3. Update messages state to include both messages
setMessages((messages) => [
  ...messages, userMessage, botMessage
]);
```

---

Now let's see how we can render the messages. In our JSX we render all the message wrapped in a `Suspense` component:

```tsx
function ChatBot() {
  const [messages, setMessages] = useState<Messages>([]);
  // ...
  return (
    // ...
    <div role="log">
      {messages.map((message, index) => (
        <Suspense key={index} fallback="Loading...">
          <MessageRenderer message={message} />
        </Suspense>
      ))}
    </div>
  )
}
```

The `MessageRenderer` component receives a prop called `message` that can be an actual message or a promise that resolves to a message. When the message is a promise, we need to inform the `Suspense` component that it should wait for the promise to resolve before rendering the message. We can do that by wrapping the `message` prop with the [`use`](https://react.dev/reference/react/use) hook.

> As of January 2024 this hook is only available in the canary version of React. Refer to the [docs](https://react.dev/reference/react/use) to understand how to use it.

```tsx
/// <reference types="react/canary" />
import { use, /* ... */ } from "react";

function MessageRenderer({ message }: { message: Message | Promise<Message> }) {
  // the use hook can be called conditionally
  const { from, content } = message instanceof Promise ? use(message) : message;
  return (
    <div>
      <p>From: {from}</p>
      <p>{content}</p>
    </div>
  );
}
```

Now, let's finish this by adding error handling. To do it you simply need to wrap the `Suspense` component with an `ErrorBoundary` and provide a fallback component that will be rendered when an error occurs:

```tsx
// ...
import { ErrorBoundary } from "react-error-boundary";

function ChatBot() {
  // ...
  return (
     // ...
    <div role="log">
      {messages.map((message, index) => (
        <ErrorBoundary fallbackRenderer={ErrorRenderer}>
          <Suspense key={index} fallback="Loading...">
            <MessageRenderer message={message} />
          </Suspense>
        </ErrorBoundary>
      ))}
    </div>
  )
}

// ...

function ErrorRenderer({ error }) {
  return (
    <div role="alert">
      <p>{error instanceof Error ? error.message : "Something went wrong"}</p>
    </div>
  )
}
```

And that's it! You can check the full code [here](https://github.com/fibonacid/react-suspence-chat-app/blob/main/src/App.tsx).

---

This approach works with streaming as well. I can't speak for performance or potential leaks, but after some brief testing I didn't notice any issues.
The idea is to pass a `ReadbleStream` to the `Suspense` fallback element and render incoming chunks as they arrive.

You can check the streaming version of the app at this [link](https://github.com/fibonacid/react-suspence-chat-app/blob/main/src/Streaming.tsx).