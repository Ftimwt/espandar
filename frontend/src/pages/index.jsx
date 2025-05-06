import {useEffect} from "react";

/**
 * @param props {{title: string, children: React.ReactNode}}
 * @returns {JSX.Element}
 * @constructor
 */
const Page = ({title, children}) => {
    useEffect(() => {
        document.title = title;
    }, [title]);

    return <div aria-label="page">
        {children}
    </div>
}

export default Page;