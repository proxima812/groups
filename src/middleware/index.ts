import { defineMiddleware } from "astro:middleware";
import micromatch from "micromatch";
import { supabase } from "../utils/libs/supabase";

const protectedRoutes = ["/dashboard(|/)"];
const redirectRoutes = ["/signin(|/)", "/register(|/)"];

export const onRequest = defineMiddleware(
  async ({ locals, url, cookies, redirect }, next) => {
    const accessToken = cookies.get("sb-access-token");
    const refreshToken = cookies.get("sb-refresh-token");

    // Устанавливаем флаг аутентификации для всех маршрутов
    locals.isAuthenticated = accessToken && refreshToken;

    if (micromatch.isMatch(url.pathname, protectedRoutes)) {
      if (!locals.isAuthenticated) {
        return redirect("/signin");
      }

      const { data, error } = await supabase.auth.setSession({
        refresh_token: refreshToken.value,
        access_token: accessToken.value,
      });

      if (error) {
        cookies.delete("sb-access-token", {
          path: "/",
        });
        cookies.delete("sb-refresh-token", {
          path: "/",
        });
        return redirect("/signin");
      }

      locals.email = data.user?.email!;
      cookies.set("sb-access-token", data?.session?.access_token!, {
        sameSite: "strict",
        path: "/",
        secure: true,
      });
      cookies.set("sb-refresh-token", data?.session?.refresh_token!, {
        sameSite: "strict",
        path: "/",
        secure: true,
      });
    }

    if (
      micromatch.isMatch(url.pathname, redirectRoutes) &&
      locals.isAuthenticated
    ) {
      return redirect("/dashboard");
    }

    return next();
  },
);
