import LocationCard from "./_components/location-card";
import SkillsCard from "./_components/skills-card";
import Welcome from "./_components/welcome";

const HomePage = () => {
  return (
    <div>
      {/* <div className='relative flex h-screen w-full items-center justify-center'></div> */}
      {/* <div className="relative flex h-dvh w-full flex-col items-center justify-around px-4 md:flex-row md:justify-center lg:px-0"> */}
      <div className="relative h-dvh mt-[-4.5rem]">
        <Welcome />
      </div>
      <div className="relative mx-auto h-screen w-full max-w-6xl p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LocationCard />
          <SkillsCard />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
