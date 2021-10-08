export default function ProfileCard() {
  return (
    <section className="bg-dark12 py-8">
      <div className="container bg-gray-900 max-w-5xl m-8 mx-auto md:flex rounded-xl p-8 md:p-0">
        <img
          className="w-32 h-32 md:w-48 md:h-auto md:rounded-none rounded-full mx-auto"
          src="/qweasd.jpg"
          alt=""
          width="384"
          height="512"
        />
        <div className="pt-6 md:p-8 text-center md:text-left space-y-4">
          <p className="text-lg font-semibold">
            Best staff Engineer the world has ever seen. Best staff Engineer the
            world has ever seen. Best staff Engineer the world has ever seen.
          </p>

          <figcaption className="font-medium">
            <div className="text-emerald-400 font-bold">Jim None</div>
            <div className="text-gray-500">Staff Engineer</div>
          </figcaption>
        </div>
      </div>
    </section>
  );
}
