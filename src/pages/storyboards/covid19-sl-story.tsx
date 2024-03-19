/**
 ** Implements Covid19 single location story
 **/

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
import { Covid19SLWorkflow } from "../../utils/storyboards/workflow/Covid19SLWorkflow";
import { covid19Data, covid19SLNFATable } from "../../services/DataService";
import { TimeseriesData } from "../../utils/storyboards/data-processing/TimeseriesData";
import { clean } from "../../utils/storyboards/data-processing/common";

// import DashboardLayout from "src/components/dashboard-layout/DashboardLayout";

const Covid19SLStoryPage = () => {
  const WIDTH = 1200,
    HEIGHT = 500;

  const chartRef = useRef(null);
  const [loading, setLoading] = useState<boolean>(null);
  const [segment, setSegment] = useState<number>(3);
  const [regions, setRegions] = useState<string[]>([]);
  const [region, setRegion] = useState<string>(null);
  const [regionsData, setRegionsData] = useState<
    Record<string, TimeseriesData[]>
  >({});
  const [tableNFA, setTableNFA] = useState<any>(null);

  // slider formatted value
  const valuetext = (value) => `${value}`;

  const workflow = new Covid19SLWorkflow();

  useEffect(() => {
    if (!chartRef.current) return;
    console.log("useEffect 1: fetchData");
    setLoading(true);

    const fetchData = async () => {
      try {
        const allData = await covid19Data();
        setRegionsData(allData);
        setRegions(Object.keys(allData).sort());
        const table = await covid19SLNFATable();
        setTableNFA(table);

        console.log("useEffect 1: allRegionData: ", allData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!region || !regionsData[region] || !chartRef.current) return;

    const regionData = regionsData[region];

    console.log("useEffect 2: region: ", region);
    console.log("useEffect 2: regionData: ", regionData);
    console.log("useEffect 2: tableNFA: ", regionData);

    // clean(chartRef.current);

    workflow
      .setName(region)
      .setData(regionData)
      .setNFATable(tableNFA)
      .setCanvas(chartRef.current)
      .create();

    return () => {};
  }, [region, regionsData, tableNFA]);

  const handleSelection = (event: SelectChangeEvent) => {
    const newRegion = event.target.value;
    // prettier-ignore
    // console.log("Covid19Story1Page:handleSelection: newRegion = ", newRegion);
    if (newRegion) {
      setRegion(newRegion);
    }
  };

  const handleChangeSlider = (event) => {
    const selectedSegment = event.target.value;
    console.log("Covid19Story1Page: selectedSegment = ", selectedSegment);
    if (selectedSegment && selectedSegment !== segment) {
      // setSegment(selectedSegment);
      // segmentData(selectedSegment);
      setSegment(1);
      // segmentData(1);
    }
  };

  const handleBeginningButton = () => {};

  const handleBackButton = () => {};

  const handlePlayButton = () => {};

  return (
    <>
      <Head>
        <title>Covid19 Single Location Story</title>
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
              title="Covid19 Single Location Story"
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
                  <svg
                    ref={chartRef}
                    style={{
                      width: WIDTH,
                      height: HEIGHT,
                      border: "0px solid",
                    }}
                  ></svg>
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

export default Covid19SLStoryPage;
