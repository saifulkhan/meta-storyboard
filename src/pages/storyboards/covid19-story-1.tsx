import { useEffect, useState, useRef } from "react";
import Head from "next/head";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import {
  Avatar,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  FormControl,
  FormGroup,
  InputLabel,
  LinearProgress,
  MenuItem,
  OutlinedInput,
  Select,
  SelectChangeEvent,
  Fade,
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { blue } from "@mui/material/colors";
import { Covid19Story1 } from "../../utils/storyboards/story-builder/Covid19Story1";

// import DashboardLayout from "src/components/dashboard-layout/DashboardLayout";

const storyBuilder = new Covid19Story1();

const Covid19StoryPage1 = () => {
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState<number>(3);
  const [regions, setRegions] = useState<string[]>([]);
  const [region, setRegion] = useState<string>("");
  const [animationCounter, setAnimationCounter] = useState<number>(0);
  // slider formatted value
  const valuetext = (value) => `${value}`;

  useEffect(() => {
    let ignore = false;

    // if (!chartRef.current) return;
    console.log("Covid19Story: useEffect triggered");

    setLoading(true);

    // Wait for initialization to complete before further actions
    storyBuilder
      .waitForInit()
      .then(() => {
        const _regions = storyBuilder.names();
        if (!ignore) setRegions([..._regions]);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleChangeSlider = (event) => {
    const selectedSegment = event.target.value;
    console.log("StorySingle: selectedSegment = ", selectedSegment);
    if (selectedSegment && selectedSegment !== segment) {
      // setSegment(selectedSegment);
      // segmentData(selectedSegment);
      setSegment(1);
      // segmentData(1);
    }
  };

  const handleSelection = (event: SelectChangeEvent) => {
    const selectedName = event.target.value;
    // prettier-ignore
    console.log("StorySingle:handleSelection: selectedRegion = ", selectedName);
    if (selectedName) {
      storyBuilder.name(selectedName).selector("#chartId").build();

      //createTimeSeriesSVG("#chart1");
      //setRegion(selectedRegion);
      //setAnimationCounter(0);
    }
  };

  const handleBeginningButton = () => {
    const count = 0;

    setAnimationCounter(count);
    console.log("StorySingle: animationCounter = ", count);
    onClickAnimate(count, "#chart1");
  };

  const handleBackButton = () => {
    const count = animationCounter - 1;
    if (count < 0) return;

    setAnimationCounter(count);
    console.log("StorySingle: animationCounter = ", count);
    onClickAnimate(count, "#chart1");
  };

  const handlePlayButton = () => {
    const count = animationCounter + 1;
    setAnimationCounter(count);
    console.log("StorySingle: animationCounter = ", count);
    onClickAnimate(count, "#chart1");
  };

  return (
    <>
      <Head>
        <title>Covid19 Story 1</title>
      </Head>
      {/* <DashboardLayout> */}
      <Box
        sx={{
          backgroundColor: "background.default",
          minHeight: "100%",
          py: 8,
        }}
      >
        <Container>
          <Card sx={{ minWidth: 1200 }}>
            <CardHeader
              avatar={
                <Avatar style={{ backgroundColor: blue[500] }}>
                  <AutoStoriesIcon />
                </Avatar>
              }
              title="Story-1"
              subheader="Choose a segment value, a region, and click play to animate the story"
            />
            <CardContent sx={{ pt: "8px" }}>
              {loading ? (
                <Box sx={{ height: 40 }}>
                  <Fade
                    in={loading}
                    style={{
                      transitionDelay: loading ? "800ms" : "0ms",
                    }}
                    unmountOnExit
                  >
                    <LinearProgress />
                  </Fade>
                </Box>
              ) : (
                <>
                  <FormGroup
                    sx={{
                      flexDirection: {
                        xs: "column",
                        sm: "row",
                        alignItems: "center",
                      },
                    }}
                  >
                    <InputLabel sx={{ m: 1, mt: 0 }} id="segment-slider-label">
                      Set segment value
                    </InputLabel>
                    <FormControl sx={{ m: 1, width: 300, mt: 0 }} size="small">
                      <Slider
                        // labelId="segment-slider"
                        aria-label="Segments"
                        defaultValue={3}
                        getAriaValueText={valuetext}
                        step={1}
                        marks
                        min={0}
                        max={5}
                        value={segment}
                        valueLabelDisplay="auto"
                        onChange={handleChangeSlider}
                      />
                    </FormControl>

                    <FormControl sx={{ m: 1, width: 300, mt: 0 }} size="small">
                      <InputLabel id="select-region-label">
                        Select region
                      </InputLabel>
                      <Select
                        labelId="select-region-label"
                        id="select-region-label"
                        displayEmpty
                        onChange={handleSelection}
                        value={region}
                        input={<OutlinedInput label="Select region" />}
                      >
                        {regions.map((d) => (
                          <MenuItem key={d} value={d}>
                            {d}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl sx={{ m: 1, width: 100, mt: 0 }}>
                      <Button
                        variant="contained"
                        disabled={!region}
                        onClick={handleBeginningButton}
                        component="span"
                      >
                        Beginning
                      </Button>
                    </FormControl>

                    <FormControl sx={{ m: 1, width: 100, mt: 0 }}>
                      <Button
                        variant="contained"
                        disabled={!region}
                        onClick={handleBackButton}
                        startIcon={<ArrowBackIosIcon />}
                        component="span"
                      >
                        Back
                      </Button>
                    </FormControl>

                    <FormControl sx={{ m: 1, width: 100, mt: 0 }}>
                      <Button
                        variant="contained"
                        disabled={!region}
                        onClick={handlePlayButton}
                        endIcon={<ArrowForwardIosIcon />}
                        component="span"
                      >
                        Play
                      </Button>
                    </FormControl>
                  </FormGroup>
                  <div id="chartId" />
                </>
              )}
            </CardContent>
          </Card>
        </Container>
      </Box>
      {/* </DashboardLayout> */}
    </>
  );
};

export default Covid19StoryPage1;
