import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AuthScreen } from "@/components/auth/auth-screen";

const push = vi.fn();
const signInWithEmail = vi.fn();
const signUpWithEmail = vi.fn();
const signInWithGoogle = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/firebase/client-auth", () => ({
  signInWithEmail: (...args: unknown[]) => signInWithEmail(...args),
  signUpWithEmail: (...args: unknown[]) => signUpWithEmail(...args),
  signInWithGoogle: (...args: unknown[]) => signInWithGoogle(...args),
  authErrorMessage: () => "Sign-in failed. Try again.",
}));

describe("AuthScreen (login)", () => {
  it("renders a heading, Google button, and the email/password form", () => {
    render(<AuthScreen mode="login" />);
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("signs in and redirects to /app on success", async () => {
    signInWithEmail.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AuthScreen mode="login" />);

    await user.type(screen.getByLabelText("Email"), "founder@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(signInWithEmail).toHaveBeenCalledWith("founder@example.com", "correct-horse");
    expect(push).toHaveBeenCalledWith("/app");
  });

  it("shows a plain error message and does not redirect on failure", async () => {
    signInWithEmail.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<AuthScreen mode="login" />);

    await user.type(screen.getByLabelText("Email"), "founder@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sign-in failed. Try again.");
    expect(push).not.toHaveBeenCalled();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<AuthScreen mode="login" />);

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(passwordInput).toHaveAttribute("type", "text");
  });
});

describe("AuthScreen (signup)", () => {
  it("renders signup-specific copy and calls signUpWithEmail on submit", async () => {
    signUpWithEmail.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AuthScreen mode="signup" />);

    expect(screen.getByRole("heading", { name: "Create an account" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "founder@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse-battery");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(signUpWithEmail).toHaveBeenCalledWith("founder@example.com", "correct-horse-battery");
    expect(push).toHaveBeenCalledWith("/app");
  });
});
