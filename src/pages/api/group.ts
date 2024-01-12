import type { APIRoute } from "astro";
import { supabase } from "../../utils/libs/supabase";

export const GET: APIRoute = async () => {
  const { data, error } = await supabase
    .from("group")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      { status: 500 },
    );
  }

  return new Response(JSON.stringify(data));
};

export const POST: APIRoute = async ({ request }) => {
  const { title, description, link, linkName } = await request.json();
  const { data, error } = await supabase
    .from("group")
    .insert({ title, description, link, linkName })
    .select();

  if (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      { status: 500 },
    );
  }

  return new Response(JSON.stringify(data));
};

export const DELETE: APIRoute = async ({ request }) => {
  const { id } = await request.json();
  const { error, data } = await supabase.from("group").delete().eq("id", id); // This line
  if (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      { status: 500 },
    );
  }

  return new Response(JSON.stringify(data));
};

export const PUT: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { id, ...updateData } = body; // Извлекаем id и оставшиеся данные для обновления

  const { data, error } = await supabase
    .from("group")
    .update(updateData) // Обновляем данные, исключая id
    .eq("id", id); // Указываем, какую запись нужно обновить

  if (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      { status: 500 },
    );
  }

  return new Response(JSON.stringify(data));
};
