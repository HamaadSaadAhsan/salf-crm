import { Navbar } from '@/partials/navbar/navbar';
import { NavbarMenu } from '@/partials/navbar/navbar-menu';
import { MENU_SIDEBAR } from '@/config/menu.config';
import { Container } from '@/components/common/container';

const PageNavbar = () => {
  const accountMenuConfig = MENU_SIDEBAR?.['3']?.children;


    return (
      <Navbar>
        <Container>
          <NavbarMenu items={accountMenuConfig ?? []} />
        </Container>
      </Navbar>
    );
};

export { PageNavbar };
