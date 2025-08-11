import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Landing } from "./pages/Landing";
import { Books } from "./pages/Books";
import { Users } from "./pages/Users";
import { Checkouts } from "./pages/Checkouts";
import { Scanner } from "./pages/Scanner";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="books" element={<Books />} />
          <Route path="users" element={<Users />} />
          <Route path="checkouts" element={<Checkouts />} />
          <Route path="scanner" element={<Scanner />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
