import { Stack, Typography } from "@mui/material";
import { useHome } from "./context";

/**
 *
 * @param {{model: {name: string, id: number}, type: "channel"|"group"|"user"}} props
 * @returns
 */
const HomeHeader = () => {
    const { selectedModel, type } = useHome();

    console.log(selectedModel, type);

    if (!selectedModel) return <></>;

    return (
        <Stack bgcolor={(theme) => theme.palette.primary.light} px={5} py={2}>
            <Typography>{selectedModel.name}</Typography>
        </Stack>
    );
};

export default HomeHeader;
