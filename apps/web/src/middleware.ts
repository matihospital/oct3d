import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/ops/login",
  },
});

export const config = {
  matcher: ["/ops", "/ops/((?!login).*)"],
};
