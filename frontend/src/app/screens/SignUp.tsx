import { Link } from "react-router";

export function SignUp() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-success mb-4">
            <span className="text-3xl">📊</span>
          </div>
          <h1 className="text-primary">The Social Market</h1>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="firstName" className="text-foreground/90">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              className="w-full px-4 py-3 rounded-2xl bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter your first name"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="lastName" className="text-foreground/90">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              className="w-full px-4 py-3 rounded-2xl bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter your last name"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="username" className="text-foreground/90">
              Username
            </label>
            <input
              type="text"
              id="username"
              className="w-full px-4 py-3 rounded-2xl bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Choose a username"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-foreground/90">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-4 py-3 rounded-2xl bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Create a password"
            />
          </div>

          <Link to="/home">
            <button className="w-full mt-6 px-6 py-4 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              Create Account
            </button>
          </Link>
        </div>

        <p className="text-center text-muted-foreground">
          Already have an account?{" "}
          <Link to="/signin" className="text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
