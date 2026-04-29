import { useParams } from 'react-router-dom';
import { Container, Card, Button } from 'react-bootstrap';

const ClassActivities = () => {
    const { courseId } = useParams();

    return (
        <Container className="py-4">
            <h4 className="fw-bold mb-4">Class Activities</h4>

            <Card className="p-4 shadow-sm border-0 rounded-4">
                <p className="text-muted">
                    Manage activities for this course
                </p>

                <Button variant="primary">
                    Add Activity
                </Button>
            </Card>
        </Container>
    );
};

export default ClassActivities;