import { test, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Dashboard } from "./Dashboard";

test("Dashboard renders correctly", () => {
  render(<Dashboard />);
  
  expect(screen.getByText("Dashboard")).toBeInTheDocument();
  expect(screen.getByText("Total Books")).toBeInTheDocument();
  expect(screen.getByText("Active Checkouts")).toBeInTheDocument();
  expect(screen.getByText("Overdue Items")).toBeInTheDocument();
});