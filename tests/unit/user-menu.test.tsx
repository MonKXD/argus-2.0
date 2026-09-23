import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { UserMenu } from "@/components/layout/user-menu";

const push = vi.fn();
const refresh = vi.fn();
const signOutUser = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/lib/firebase/client-auth", () => ({
  signOutUser: (...args: unknown[]) => signOutUser(...args),
}));

describe("UserMenu", () => {
  it("shows the account email and signs out on click", async () => {
    signOutUser.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<UserMenu email="founder@example.com" />);

    await user.click(screen.getByRole("button", { name: "Account menu, founder@example.com" }));
    expect(screen.getByText("founder@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(signOutUser).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login");
  });

  it("still works with a generic label when no email is known", async () => {
    const user = userEvent.setup();
    render(<UserMenu email={null} />);
    expect(screen.getByRole("button", { name: "Account menu" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
