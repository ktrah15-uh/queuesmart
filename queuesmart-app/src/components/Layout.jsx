import Navbar from "./Navbar";

function Layout({ children }) {
    return (
        <div>
      <Navbar />
      <main
        style={{
          maxWidth: "var(--max-width)",
          margin: "0 auto",
          padding: "var(--space-lg)",
        }}
      >
        {children}
      </main>
    </div>
    );
}

export default Layout;