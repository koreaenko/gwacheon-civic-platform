import { Routes, Route } from "react-router-dom";
import { SkyCanvas } from "./components/SkyCanvas";
import { Admin } from "./pages/Admin";

function App() {
  return (
    <Routes>
      <Route path="/" element={<SkyCanvas />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}

export default App;
