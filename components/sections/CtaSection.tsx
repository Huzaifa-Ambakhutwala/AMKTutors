import Link from "next/link";

export default function CtaSection({ props }: { props: any }) {
    return (
        <section className="py-20 bg-primary text-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 font-heading">{props.title}</h2>
                {props.description && <p className="text-xl text-blue-100 mb-10">{props.description}</p>}

                {props.buttonText && props.buttonHref && (
                    <Link
                        href={props.buttonHref}
                        className="inline-block bg-white text-primary px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-100 transition-all shadow-lg"
                    >
                        {props.buttonText}
                    </Link>
                )}
            </div>
        </section>
    );
}
