// Unified site header.
// Every page now renders the new CRAZZY floating header (CrazyHeader) so the
// whole site shares one identity instead of looking like two different sites.
// Kept as a default export named "Header" so the 15+ pages that already import
// `Header from "@/components/Header"` pick up the new header with no changes.
import { CrazyHeader } from "@/components/crazy-hero/CrazyHeader";

const Header = () => <CrazyHeader />;

export default Header;
