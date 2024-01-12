import EditorJS from "@editorjs/editorjs";
import DOMPurify from "dompurify";
import {
  ErrorBoundary,
  For,
  createResource,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";

const fetcher = async (_, { refetching, value }) => {
  const res = await fetch("/api/group", {
    method: refetching ? "POST" : "GET",
    body: refetching ? JSON.stringify(refetching) : null,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message);
  }

  // return data;
  const prev = value ?? [];
  return [...data, ...prev];
};

function extractTextFromEditorData(editorData) {
  return editorData.blocks
    .map((block) => {
      let text = block.data.text;

      // Преобразуем URL-адреса в гиперссылки для параграфов
      if (block.type === "paragraph") {
        text = convertUrlsToLinks(text);
      }

      // Санитация преобразованного текста
      const sanitizedText = DOMPurify.sanitize(text);

      switch (block.type) {
        case "paragraph":
          return `<p>${sanitizedText}</p>`;
        // Добавьте здесь обработку других типов блоков, если это необходимо
        default:
          return "";
      }
    })
    .join("");
}

function convertUrlsToLinks(text) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return text.replace(urlRegex, function (url) {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
}

const TextEditor = (props) => {
  let editorContainer;
  let editorInstance = null;
  const forbiddenWords = ["xxx", "порно", "продажа", "куплю"]; // Замените на запрещенные слова

  const containsForbiddenWords = (text) => {
    return forbiddenWords.some((word) => text.includes(word));
  };

  onMount(() => {
    if (!editorInstance) {
      const editor = new EditorJS({
        holder: editorContainer,
        autofocus: true,
        placeholder: "Полное расписание или же информация о группе..",
        theme: "dark",
        tools: {},

        data: {
          blocks: [
            {
              type: "paragraph",
              data: {
                text: props.value,
              },
            },
          ],
        },

        onChange: () => {
          editor.save().then((outputData) => {
            const text = outputData.blocks.map((block) => block.data.text);
            const processedText = convertUrlsToLinks(text);
            if (containsForbiddenWords(text)) {
              // Обработка случая наличия запрещенных слов
              alert("Ваш текст содержит запрещенные слова.");
            } else {
              props.onInput(text);
            }
          });
        },
      });

      props.setEditorInstance(editor);
    }
  });

  onCleanup(() => {
    editorInstance?.destroy();
  });

  return <div ref={editorContainer}></div>;
};

export function FormAddGroup({ reviews }) {
  const [editorInstance, setEditorInstance] = createSignal(null);
  const [url, setUrl] = createSignal("");
  const [title, setTitle] = createSignal("");
  const [linkName, setLinkName] = createSignal("");
  const [description, setDescription] = createSignal("");

  const [data, { refetch }] = createResource(fetcher, {
    initialValue: reviews,
    ssrLoadFrom: "initial",
  });

  const handleInputChange = (e) => {
    let inputValue = e.target.value;
    if (
      !inputValue.startsWith("http://") &&
      !inputValue.startsWith("https://")
    ) {
      inputValue = "https://" + inputValue;
    }
    setUrl(DOMPurify.sanitize(inputValue)); // Санитация URL
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/group`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        // Если запрос не прошел, обрабатываем ошибку
        const errorData = await res.json();
        throw new Error(
          errorData.message || "Произошла ошибка при удалении группы",
        );
      }
      // Решить проблему
      window.location.reload();
    } catch (error) {
      console.error("Ошибка при удалении группы:", error);
    }
  };

  const onSubmitHandler = async (e) => {
    // e.preventDefault();

    let description;
    await editorInstance()
      .save()
      .then((outputData) => {
        description = extractTextFromEditorData(outputData);
      });

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    const title = formData.get("title")?.toString();
    const link = formData.get("link")?.toString();
    const linkName = formData.get("linkName")?.toString();

    if (!description) return;

    refetch({ title, description, link, linkName });
    formElement.reset();
  };

  const sortedData = data().sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );

  return (
    <div class="max-w-3xl w-full">
      <ErrorBoundary fallback={<div>Ошибка!</div>}>
        <form
          onsubmit={onSubmitHandler}
          class=" relative bg-center-gradient-light dark:bg-center-gradient-dark dark:text-white rounded-md p-6"
        >
          <div>
            <label
              class="flex gap-1 items-center mb-1 font-medium dark:text-white text-zinc-900 text-sm"
              for="name"
            >
              Название группы
              <span className="text-zinc-500 text-sm">(необязятально)</span>
            </label>
            <input
              id="title"
              type="text"
              value={title()}
              onInput={(e) => setTitle(e.currentTarget.value)}
              placeholder="Рассвет"
              name="title"
              class="w-full block focus:dark:bg-zinc-800 rounded-md py-1.5 px-3 dark:bg-zinc-900 dark:border-zinc-600 border bg-zinc-50 border-zinc-300  focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600  focus:bg-white focus:ring-opacity-60 leading-6"
            />
          </div>
          <div class="mt-3">
            <label
              class="block mb-1 font-medium  dark:text-white  text-zinc-900 text-sm"
              for="description"
            >
              <span className="text-red-500">*</span> Описание
            </label>

            <TextEditor
              value={description()}
              onInput={setDescription}
              setEditorInstance={setEditorInstance}
            />
          </div>
          <div class="mt-3 flex gap-3">
            <div>
              <label
                class="flex gap-1 items-center mb-1 font-medium dark:text-white text-zinc-900 text-sm"
                for="link"
              >
                Ссылка
                <span className="text-zinc-500 text-sm">(необязятально)</span>
              </label>
              <input
                id="link"
                type="url"
                value={url()}
                onInput={handleInputChange}
                class="w-full block focus:dark:bg-zinc-800 rounded-md py-1.5 px-3 dark:bg-zinc-900 dark:border-zinc-600 border bg-zinc-50 border-zinc-300  focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600  focus:bg-white focus:ring-opacity-60 leading-6"
                placeholder="https://"
                name="link"
              />
            </div>
            <div>
              <label
                class="flex gap-1 items-center mb-1 font-medium dark:text-white text-zinc-900 text-sm"
                for="linkName"
              >
                Имя ссылки
              </label>
              <input
                id="linkName"
                type="text"
                value={linkName()}
                onInput={(e) => setLinkName(e.currentTarget.value)}
                class="w-full block focus:dark:bg-zinc-800 rounded-md py-1.5 px-3 dark:bg-zinc-900 dark:border-zinc-600 border bg-zinc-50 border-zinc-300  focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600  focus:bg-white focus:ring-opacity-60 leading-6"
                placeholder="Войти в группу"
                name="linkName"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={data.loading}
            class="h-9 rounded-md px-3 w-full mt-4 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed bg-black dark:text-black text-white dark:bg-zinc-50"
          >
            Добавить
          </button>
        </form>

        <ul class="grid items-start grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <For each={sortedData}>
            {(review) => (
              <div class="relative bg-center-gradient-light dark:bg-center-gradient-dark p-5 rounded-xl flex flex-col gap-3">
                <button
                  class="absolute top-3 text-sm right-3 text-red-500"
                  onClick={() => handleDelete(review.id)}
                >
                  Удалить
                </button>
                <h3 className="text-2xl font-bold">{review.title}</h3>
                <p
                  class="flex flex-col gap-3 text-sm prose-a:text-blue-600 dark:prose-a:text-blue-500 prose-a:underline"
                  innerHTML={DOMPurify.sanitize(review.description)}
                />
                <div class="flex justify-between items-center">
                  {review.link && review.linkName && (
                    <a
                      href={review.link}
                      class="self-start flex items-center gap-1 text-sm bg-blue-500 px-3 py-1 rounded-md text-white"
                    >
                      {review.linkName}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="lucide lucide-arrow-right-to-line"
                      >
                        <path d="M17 12H3" />
                        <path d="m11 18 6-6-6-6" />
                        <path d="M21 5v14" />
                      </svg>
                    </a>
                  )}
                  <span class="text-xs text-right">
                    {new Date(review.created_at).toLocaleDateString("ru-RU", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            )}
          </For>
        </ul>
      </ErrorBoundary>
    </div>
  );
}
