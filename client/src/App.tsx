import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/Layout";
import "./global.css"

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Layout />,
      children: [],
    },
    {
      path: "/:chatId",
      element: <Layout />,
      children: [],
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
