import * as React from "react"
import { cn } from "./Card" // Reusing cn utility for now

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "glass", size = "default", ...props }, ref) => {

        // Base classes
        const base = "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";

        // Variant classes
        const variants = {
            primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md",
            secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
            ghost: "hover:bg-white/40 text-gray-700",
            glass: "glass-button text-gray-800 font-semibold",
            danger: "bg-red-600 text-white hover:bg-red-700 shadow-md",
        };

        // Size classes
        const sizes = {
            default: "h-10 px-4 py-2",
            sm: "h-8 rounded-full px-3 text-xs",
            lg: "h-12 rounded-full px-8 text-base",
            icon: "h-10 w-10",
        };

        return (
            <button
                ref={ref}
                className={cn(base, variants[variant], sizes[size], className)}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
