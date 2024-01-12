# Using React's latest feature to create an AI Chatbot

AI Chatbots are a bit weird. When a user submits a message, a structure called `Message` needs to be created right away, while another one needs to be created after the bot has responded.

Let's start by defining the `Message` type:

```tsx
type Message = {
  from: "user" | "bot";
  id: string;
  content: string;
}
```

Pretty straightforward. Now, since the bot message will be created asynchronously, we can 
use a `Promise` to represent it:

```tsx
type Messages = Message | Promise<Message>;
```

With `Suspense` React is able to render both types of messages without any problems. Let's see how we can use it:

First, we store the messages and the user input with `useState`:

```tsx
const [messages, setMessages] = useState<Messages>([]);
const [input, setInput] = useState("");
```

Then, we create a handler for when the user submits a message:

```tsx
const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
  (e) => {
    e.preventDefault();
    if (input === "") return;
    // 1. Create `Message` with the user's input
    // 2. Create a promise that resolves to a `Message` with the bot's response
    // 3. Update messages state to include both messages
  },
  [setMessages, input]
);
```

*Step 1* is easy, we just need to create a `Message` with the user's input:

```tsx
const userMessage: Message = {
  from: "user",
  id: Date.now().toString(),
  content: input,
};
```

*Step 2* is a bit more complicated. We need to define a function that retrieves the bot's response asynchronously. We can use `setTimeout` to simulate a network request:

```tsx
function fetchResponse(question: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("I don't know");
    }, 1000);
  });
}
```

In the handler body we can now create the `LazyMessage` by calling the `fetchResponse` and mapping the result to a `Message`:

```tsx
const botMessage: Promise<Message> = fetchResponse(input).then((response) => ({
  from: "bot",
  id: Date.now().toString(),
  content: response,
}));
```

Finally, we can add both messages to the state:

```tsx
setMessages((messages) => [...messages, userMessage, botMessage]);
```

---

Now let's see how we can render the messages. In our JSX we render all the message
wrapped in a `Suspense` component:

```tsx
<div role="log">
  {messages.map((message, index) => (
    <Suspense key={index} fallback="Loading...">
      <MessageRenderer message={message} />
    </Suspense>
  ))}
</div>
```

The `MessageRenderer` component receives a `message` prop that can be an actual message (`Message`) or a promise (`LazyMessage`). When the message is a promise, we need to inform the `Suspense` component that it should wait for the promise to resolve before rendering the message. We can do that by wrapping the `message` prop with the `use` hook.

> As of January 2024 this hook is only available in the canary version of React. Refer to the [docs](https://react.dev/reference/react/use) to understand how to use it.

```tsx
/// <reference types="react/canary" />
import { use } from "react";

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

One thing to note here is that, contrary to regular hooks, `use` can be called conditionally.

---

Now, let's finish this by adding error handling. To do it you simply need to wrap the `Suspense` component with an `ErrorBoundary`:

```tsx
import { ErrorBoundary } from "react-error-boundary";

<ErrorBoundary fallback={<p>Something went wrong</p>}>
  <Suspense key={index} fallback="Loading...">
    <MessageRenderer message={message} />
  </Suspense>
</ErrorBoundary>;
```
