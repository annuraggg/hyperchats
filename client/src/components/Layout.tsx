import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/clerk-react";

const Layout = () => {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <div>
          <h1>Welcome to Hyperchats</h1>
        </div>
      </SignedIn>
    </>
  );
};

export default Layout;
