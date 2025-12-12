export default function CustomHtmlSection({ props }: { props: any }) {
    return (
        <section className="py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div dangerouslySetInnerHTML={{ __html: props.html }} />
            </div>
        </section>
    );
}
