// The menu's link to the enquiries the site's forms received (src/admin/Enquiries.tsx).
import Link from "next/link"

export const EnquiriesLink = () => (
  <div className="wd-navgroup">
    <span className="wd-navlabel">Inbox</span>
    <Link className="nav__link" href="/cms/enquiries">
      <span className="nav__link-label">Enquiries</span>
    </Link>
  </div>
)

export default EnquiriesLink
