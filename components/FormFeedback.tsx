import { AlertCircle, CheckCircle } from "lucide-react";

interface FormFeedbackProps {
    message?: string | null;
    type?: "success" | "error";
}

export function FormFeedback({ message, type = "error" }: FormFeedbackProps) {
    if (!message) return null;

    if (type === "success") {
        return (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-green-200">
                <CheckCircle size={16} />
                {message}
            </div>
        );
    }

    return (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-red-200">
            <AlertCircle size={16} />
            {message}
        </div>
    );
}

interface FormErrorProps {
    message?: string;
}

export function InlineError({ message }: FormErrorProps) {
    if (!message) return null;
    return <p className="text-red-500 text-xs mt-1 ml-1">{message}</p>;
}
