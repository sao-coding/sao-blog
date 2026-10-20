import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@tanstack/react-router";

const SiteOwnerAvatar = () => {
  return (
    <Link to="/" aria-label="回到首頁">
      <Avatar className="size-10">
        <AvatarImage src="/img/avatar.jpg" />
        <AvatarFallback>唯</AvatarFallback>
      </Avatar>
    </Link>
  );
};

export default SiteOwnerAvatar;
